import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const NO_BACKGROUND_AUTH = { auth: { autoRefreshToken: false, persistSession: false } };

async function createSignedInTestUser(): Promise<
  { userId: string; accessToken: string } | null
> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const email = `signup-events-test-${Date.now()}-${Math.random()}@example.com`;
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

function clientAs(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...NO_BACKGROUND_AUTH,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

Deno.test("game_signup_events - logs joins, withdrawals and removals for game admins only", async () => {
  if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    console.log("Skipping: no service role / anon key (CI environment)");
    return;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const creator = await createSignedInTestUser();
  const alice = await createSignedInTestUser();
  const bob = await createSignedInTestUser();
  const carol = await createSignedInTestUser();
  const userIds = [creator, alice, bob, carol].flatMap((u) => (u ? [u.userId] : []));
  let gameId: string | null = null;

  try {
    if (!creator || !alice || !bob || !carol) {
      console.log("Skipping: could not create signed-in test users");
      return;
    }

    const { data: game, error: gameError } = await clientAs(creator.accessToken)
      .from("games")
      .insert({
        team1_name: "Black",
        team2_name: "White",
        players_per_team: 1,
        kickoff_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        visible_at: new Date().toISOString(),
        created_by: creator.userId,
      })
      .select("id")
      .single();
    if (gameError) throw gameError;
    gameId = game.id;

    // Friend games are visible to invitees; invite the players so they can sign up.
    await admin.from("game_invitations").insert(
      [alice, bob, carol].map((u) => ({
        game_id: game.id,
        invited_user_id: u.userId,
        invited_by: creator.userId,
      })),
    );

    for (const [i, player] of [alice, bob, carol].entries()) {
      const { error } = await clientAs(player.accessToken)
        .from("player_games")
        .insert({ game_id: game.id, user_id: player.userId, signup_order: i + 1 });
      if (error) throw error;
    }

    // Alice withdraws herself; the creator removes Bob.
    await clientAs(alice.accessToken).from("player_games").delete()
      .eq("game_id", game.id).eq("user_id", alice.userId);
    await clientAs(creator.accessToken).from("player_games").delete()
      .eq("game_id", game.id).eq("user_id", bob.userId);

    // Carol deletes her account.
    await admin.auth.admin.deleteUser(carol.userId);

    const { data: events, error: eventsError } = await clientAs(creator.accessToken)
      .from("game_signup_events")
      .select("event_type, user_id, actor_id, waitlisted")
      .eq("game_id", game.id)
      .order("created_at", { ascending: true });
    if (eventsError) throw eventsError;

    assertEquals(events, [
      { event_type: "joined", user_id: alice.userId, actor_id: alice.userId, waitlisted: false },
      { event_type: "joined", user_id: bob.userId, actor_id: bob.userId, waitlisted: false },
      { event_type: "joined", user_id: null, actor_id: null, waitlisted: true },
      { event_type: "withdrew", user_id: alice.userId, actor_id: alice.userId, waitlisted: false },
      { event_type: "removed", user_id: bob.userId, actor_id: creator.userId, waitlisted: false },
      { event_type: "account_deleted", user_id: null, actor_id: null, waitlisted: false },
    ]);

    // A player (not an admin) can't read the log, nor write to it.
    const { data: asPlayer } = await clientAs(alice.accessToken)
      .from("game_signup_events")
      .select("id")
      .eq("game_id", game.id);
    assertEquals(asPlayer, []);

    const { error: forgeError } = await clientAs(creator.accessToken)
      .from("game_signup_events")
      .insert({ game_id: game.id, event_type: "joined", user_id: alice.userId });
    assert(forgeError, "clients must not be able to write audit events directly");
  } finally {
    if (gameId) await admin.from("games").delete().eq("id", gameId);
    for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  }
});
