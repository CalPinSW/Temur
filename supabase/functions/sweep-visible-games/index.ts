import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const GAME_BATCH_SIZE = 50;
const EXPO_TICKET_BATCH_SIZE = 100; // Expo push API cap per request

interface MemberRow {
  user_id: string;
  profile: { push_token: string | null; notifications_enabled: boolean | null } | null;
}

///*** Periodically swept by the pg_cron job "sweep-visible-games" (see
// supabase/migrations/20260812090000_add_notification_infra.sql). Notifies
// every member of a game's group once that game's visible_at has passed.
// Deployed with --no-verify-jwt: the caller (pg_cron via pg_net) has no user
// JWT, so this authenticates via a shared secret instead. ***///
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('EDGE_FUNCTION_SECRET');
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, group_id, group:groups(name)')
      .not('group_id', 'is', null)
      .is('visibility_notified_at', null)
      .lte('visible_at', new Date().toISOString())
      .limit(GAME_BATCH_SIZE);

    if (gamesError) throw gamesError;
    if (!games || games.length === 0) {
      return new Response(JSON.stringify({ swept: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let notified = 0;

    for (const game of games) {
      const groupName = Array.isArray(game.group) ? game.group[0]?.name : game.group?.name;

      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, profile:profiles(push_token, notifications_enabled)')
        .eq('group_id', game.group_id);

      if (membersError) {
        console.error(`sweep: failed to load members for game ${game.id}`, membersError);
        continue; // leave visibility_notified_at null; next sweep retries
      }

      // Keep in sync with NotificationTemplates.gameVisible() in
      // app/src/services/notificationService.ts — Deno can't import that
      // React Native module, so the copy is duplicated here by hand.
      const tickets = ((members as MemberRow[]) || [])
        .filter((m) => m.profile?.push_token && m.profile.notifications_enabled !== false)
        .map((m) => ({
          to: m.profile!.push_token,
          title: 'New Game Available',
          body: groupName
            ? `A new game is open for sign-ups in ${groupName}`
            : 'A new game is open for sign-ups',
          data: { screen: 'GameDetail', gameId: game.id },
          sound: 'default',
        }));

      for (let i = 0; i < tickets.length; i += EXPO_TICKET_BATCH_SIZE) {
        const batch = tickets.slice(i, i + EXPO_TICKET_BATCH_SIZE);
        const resp = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(batch),
        });
        if (!resp.ok) {
          console.error(`sweep: Expo push batch failed for game ${game.id}`, await resp.text());
        }
      }

      // Mark notified regardless of whether anyone had a token, guarded so
      // overlapping sweep runs can't double-count (each only flips a row
      // that's still NULL).
      const { error: markError } = await supabase
        .from('games')
        .update({ visibility_notified_at: new Date().toISOString() })
        .eq('id', game.id)
        .is('visibility_notified_at', null);

      if (markError) {
        console.error(`sweep: failed to mark game ${game.id} notified`, markError);
        continue;
      }
      notified++;
    }

    return new Response(JSON.stringify({ swept: games.length, notified }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sweep-visible-games error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
