import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAuthedSupabaseClient, getAuthedUserId } from '../_shared/rate-limit-example.ts';
import { buildNotificationEmail, sendEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'game_invite'
  | 'team_assigned'
  | 'ringers_open';

interface NotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Re-checks the caller's relationship to the notification target under an
// RLS-scoped client (built from the caller's own JWT), so existing RLS
// policies stay the single source of truth for "is this caller allowed to
// notify this target" rather than duplicating that logic here.
async function isAuthorized(
  req: Request,
  callerId: string,
  targetUserId: string,
  type: NotificationType,
  data?: Record<string, unknown>
): Promise<boolean> {
  if (callerId === targetUserId) return true;

  const authed = await getAuthedSupabaseClient(req);
  if (!authed) return false;

  switch (type) {
    case 'friend_request':
    case 'friend_accepted': {
      const { data: rows } = await authed
        .from('friendships')
        .select('id')
        .or(
          `and(user_id.eq.${callerId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${callerId})`
        )
        .limit(1);
      return !!rows?.length;
    }
    case 'group_invite': {
      const { data: rows } = await authed
        .from('group_invitations')
        .select('id')
        .eq('invited_by', callerId)
        .eq('invited_user_id', targetUserId)
        .limit(1);
      return !!rows?.length;
    }
    case 'game_invite': {
      const { data: rows } = await authed
        .from('game_invitations')
        .select('id')
        .eq('invited_by', callerId)
        .eq('invited_user_id', targetUserId)
        .limit(1);
      return !!rows?.length;
    }
    case 'team_assigned': {
      const gameId = data?.gameId;
      if (typeof gameId !== 'string' || !UUID_RE.test(gameId)) return false;

      const { data: isAdmin } = await authed.rpc('is_game_admin', {
        p_game_id: gameId,
        p_user_id: callerId,
      });
      if (!isAdmin) return false;

      const { data: rows } = await authed
        .from('player_games')
        .select('id')
        .eq('game_id', gameId)
        .eq('user_id', targetUserId)
        .not('team', 'is', null)
        .limit(1);
      return !!rows?.length;
    }
    case 'ringers_open': {
      const gameId = data?.gameId;
      if (typeof gameId !== 'string' || !UUID_RE.test(gameId)) return false;

      const { data: isAdmin } = await authed.rpc('is_game_admin', {
        p_game_id: gameId,
        p_user_id: callerId,
      });
      if (!isAdmin) return false;

      const { data: game } = await authed
        .from('games')
        .select('group_id')
        .eq('id', gameId)
        .single();
      if (!game?.group_id) return false;

      const { data: isMember } = await authed.rpc('is_group_member', {
        p_group_id: game.group_id,
        p_user_id: targetUserId,
      });
      return !!isMember;
    }
    default:
      return false;
  }
}

///*** Sends a push notification to a user's device, authorizing the caller
// against the relationship implied by `type` (see isAuthorized above) before
// sending. Requires a Supabase profiles table with a push_token column and a
// notification_preferences table (see the notification_preferences
// migration) governing per-type push/email delivery. ***///
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const callerId = await getAuthedUserId(req);
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, type, title, body, data } = (await req.json()) as NotificationRequest;

    if (!userId || !UUID_RE.test(userId) || !type || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'userId, type, title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!(await isAuthorized(req, callerId, userId, type, data))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Caps repeated identical sends (same caller, target, type, entity) so
    // calling this endpoint directly in a loop — or an admin mashing
    // "notify" — can't spam a user with duplicate push/email notifications.
    const entityKey = typeof data?.gameId === 'string' ? data.gameId : '';
    const authed = await getAuthedSupabaseClient(req);
    const { data: allowedToSend, error: throttleError } = await authed!.rpc(
      'check_and_log_notification_send',
      { p_target_user_id: userId, p_notification_type: type, p_entity_key: entityKey }
    );

    if (!throttleError && !allowedToSend) {
      return new Response(
        JSON.stringify({ success: true, throttled: true, push: null, email: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Could not load recipient profile' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: preference } = await supabase
      .from('notification_preferences')
      .select('push_enabled, email_enabled')
      .eq('user_id', userId)
      .eq('notification_type', type)
      .maybeSingle();

    // No row means the recipient hasn't overridden this type — both
    // channels default to enabled (see the notification_preferences
    // migration).
    const pushEnabled = preference?.push_enabled ?? true;
    const emailEnabled = preference?.email_enabled ?? true;

    // Push and email are independent delivery paths, each gated by its own
    // preference: a user with no push_token (every web-only user, since web
    // has no push registration) should still get an email when email is
    // enabled, and vice versa.
    let push: unknown = null;
    if (pushEnabled && profile.push_token) {
      const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify({
          to: profile.push_token,
          title,
          body,
          data,
          sound: 'default',
        }),
      });
      push = await pushResponse.json();
    }

    let email: unknown = null;
    if (emailEnabled) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.user?.email) {
        const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://temur-web.vercel.app';
        const { subject, html } = buildNotificationEmail(type, title, body, data, siteUrl);
        email = await sendEmail(authUser.user.email, subject, html);
      }
    }

    return new Response(
      JSON.stringify({ success: true, push, email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
