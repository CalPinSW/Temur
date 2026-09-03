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
  const email = `rating-summary-test-${Date.now()}-${Math.random()}@example.com`;
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
  "get_player_rating_summary - only a game admin can read aggregated averages; every player can still rate",
  async () => {
    if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      console.log("Skipping: no service role / anon key (CI environment)");
      return;
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
    const creator = await createSignedInTestUser();
    const player = await createSignedInTestUser();
    if (!creator || !player) {
      console.log("Skipping: could not create signed-in test users");
      return;
    }

    let gameId: string | null = null;

    try {
      const pastKickoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: game, error: gameError } = await admin
        .from("games")
        .insert({
          created_by: creator.userId,
          team1_name: "Black",
          team2_name: "White",
          players_per_team: 6,
          kickoff_date: pastKickoff,
          visible_at: pastKickoff,
        })
        .select("id")
        .single();
      if (gameError) throw gameError;
      gameId = game.id;

      const { data: playerGames, error: pgError } = await admin
        .from("player_games")
        .insert([
          { game_id: gameId, user_id: creator.userId, signup_order: 1 },
          { game_id: gameId, user_id: player.userId, signup_order: 2 },
        ])
        .select("id, user_id");
      if (pgError) throw pgError;

      const creatorPg = playerGames.find((pg) => pg.user_id === creator.userId)!;
      const playerPg = playerGames.find((pg) => pg.user_id === player.userId)!;

      // A non-admin player can still submit a rating.
      const playerClient = clientAs(player.accessToken);
      const { error: rateError } = await playerClient.from("player_ratings").insert({
        player_game_id: creatorPg.id,
        rated_by: player.userId,
        rating: 8,
      });
      assertEquals(rateError, null);

      const creatorClient = clientAs(creator.accessToken);
      const { error: rateBackError } = await creatorClient.from("player_ratings").insert({
        player_game_id: playerPg.id,
        rated_by: creator.userId,
        rating: 6,
      });
      assertEquals(rateBackError, null);

      const ids = [creatorPg.id, playerPg.id];

      // The game admin (its creator) sees the aggregates.
      const { data: adminSummary, error: adminSummaryError } = await creatorClient.rpc(
        "get_player_rating_summary",
        { p_player_game_ids: ids }
      );
      assertEquals(adminSummaryError, null);
      assertEquals(adminSummary?.length, 2);

      // The non-admin player gets nothing back.
      const { data: playerSummary, error: playerSummaryError } = await playerClient.rpc(
        "get_player_rating_summary",
        { p_player_game_ids: ids }
      );
      assertEquals(playerSummaryError, null);
      assertEquals(playerSummary?.length ?? 0, 0);

      // ...but can still read back their own rating to prefill the form.
      const { data: ownRatings } = await playerClient
        .from("player_ratings")
        .select("rating")
        .eq("rated_by", player.userId);
      assertEquals(ownRatings?.length, 1);
    } finally {
      if (gameId) await admin.from("games").delete().eq("id", gameId);
      await deleteTestUser(creator.userId);
      await deleteTestUser(player.userId);
    }
  }
);
