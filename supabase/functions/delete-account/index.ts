import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAuthedUserId } from '../_shared/rate-limit-example.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Soft-deletes any group where the caller is the sole member, matching
// delete_group's own cascade-to-games behavior. Has to run *before*
// auth.admin.deleteUser() below: that call cascades profiles.id ON DELETE
// CASCADE through group_members immediately, destroying the very evidence
// (who else, if anyone, is still in the group) this check needs.
async function softDeleteSoleOwnedGroups(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  for (const { group_id } of memberships ?? []) {
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group_id);

    if (count !== 1) continue;

    const now = new Date().toISOString();
    await supabase
      .from('games')
      .update({ deleted_at: now, updated_at: now })
      .eq('group_id', group_id)
      .is('deleted_at', null);

    await supabase
      .from('groups')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', group_id)
      .is('deleted_at', null);
  }
}

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await softDeleteSoleOwnedGroups(supabase, callerId);

    // Deleting the auth.users row cascades through profiles.id ON DELETE
    // CASCADE to everything else the user owns (friendships, game
    // signups, ratings given and received, saved ringers), nulls out
    // games/groups/ringer slots they created for others (ON DELETE SET
    // NULL), and fires the existing avatar-cleanup storage trigger.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(callerId);

    if (deleteError) {
      console.error('Failed to delete user:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
