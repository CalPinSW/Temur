import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAuthedSupabaseClient, getAuthedUserId } from '../_shared/rate-limit-example.ts';

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
  | 'team_assigned';

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
    default:
      return false;
  }
}

///*** Sends a push notification to a user's device, authorizing the caller
// against the relationship implied by `type` (see isAuthorized above) before
// sending. Requires a Supabase profiles table with push_token and
// notifications_enabled columns. ***///
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's push token and notification preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token, notifications_enabled')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.push_token) {
      return new Response(
        JSON.stringify({ error: 'User has no push token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has notifications enabled
    if (profile.notifications_enabled === false) {
      return new Response(
        JSON.stringify({ error: 'User has notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification via Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
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

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, result }),
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
