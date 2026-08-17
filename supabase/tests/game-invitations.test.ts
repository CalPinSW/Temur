import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const NO_BACKGROUND_AUTH = { auth: { autoRefreshToken: false, persistSession: false } };

async function createSignedInTestUser(): Promise<
  { userId: string; accessToken: string } | null
> {
  if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) return null;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const email = `game-invitations-test-${Date.now()}-${Math.random()}@example.com`;
  const password = "test123456";

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) return null;

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, NO_BACKGROUND_AUTH);
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signedIn.session) {
    await admin.auth.admin.deleteUser(created.user.id);
    return null;
  }

  return { userId: created.user.id, accessToken: signedIn.session.access_token };
}

async function deleteTestUser(userId: string): Promise<void> {
  if (!SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

function clientAs(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...NO_BACKGROUND_AUTH,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

Deno.test(
  "game_invitations - lets an invited non-member view and sign up for a group game, without granting group membership",
  async () => {
    if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      console.log("Skipping: no service role / anon key (CI environment)");
      return;
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
    const groupAdmin = await createSignedInTestUser();
    const invitee = await createSignedInTestUser();
    if (!groupAdmin || !invitee) {
      console.log("Skipping: could not create signed-in test users");
      return;
    }

    let groupId: string | null = null;
    let gameId: string | null = null;

    try {
      const { data: group, error: groupError } = await admin
        .from("groups")
        .insert({ name: `Test Group ${Date.now()}`, created_by: groupAdmin.userId })
        .select("id")
        .single();
      if (groupError) throw groupError;
      groupId = group.id;

      const { data: game, error: gameError } = await admin
        .from("games")
        .insert({
          group_id: groupId,
          created_by: groupAdmin.userId,
          team1_name: "Black",
          team2_name: "White",
          players_per_team: 6,
          kickoff_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          visible_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (gameError) throw gameError;
      gameId = game.id;

      const inviteeClient = clientAs(invitee.accessToken);

      // Before any invitation: an outsider can't see the group game at all.
      const { data: beforeInvite } = await inviteeClient
        .from("games")
        .select("id")
        .eq("id", gameId);
      assertEquals(beforeInvite?.length ?? 0, 0);

      // The group admin invites them — exercises game_invitations' own
      // INSERT policy (is_game_admin), not just a service-role bypass.
      const groupAdminClient = clientAs(groupAdmin.accessToken);
      const { error: inviteError } = await groupAdminClient.from("game_invitations").insert({
        game_id: gameId,
        invited_by: groupAdmin.userId,
        invited_user_id: invitee.userId,
      });
      assertEquals(inviteError, null);

      // After the invitation: can_view_game's new fallback lets them read it.
      const { data: afterInvite } = await inviteeClient
        .from("games")
        .select("id")
        .eq("id", gameId);
      assertEquals(afterInvite?.length ?? 0, 1);

      // Group membership itself is untouched by the invitation.
      const { data: membership } = await inviteeClient
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", invitee.userId);
      assertEquals(membership?.length ?? 0, 0);

      // The self-signup policy delegates to can_view_game, so this should
      // now succeed for the invited outsider.
      const { error: signupError } = await inviteeClient.from("player_games").insert({
        game_id: gameId,
        user_id: invitee.userId,
        signup_order: 1,
      });
      assertEquals(signupError, null);
    } finally {
      if (gameId) await admin.from("games").delete().eq("id", gameId);
      if (groupId) await admin.from("groups").delete().eq("id", groupId);
      await deleteTestUser(groupAdmin.userId);
      await deleteTestUser(invitee.userId);
    }
  }
);
