import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const NO_BACKGROUND_AUTH = { auth: { autoRefreshToken: false, persistSession: false } };

function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
}

async function createUser(): Promise<string | null> {
  const { data, error } = await admin().auth.admin.createUser({
    email: `compact-order-${Date.now()}-${Math.random()}@example.com`,
    password: "test123456",
    email_confirm: true,
  });
  return error || !data.user ? null : data.user.id;
}

async function orders(gameId: string): Promise<number[]> {
  const { data } = await admin()
    .from("player_games")
    .select("signup_order")
    .eq("game_id", gameId)
    .order("signup_order", { ascending: true });
  return (data ?? []).map((r) => r.signup_order);
}

Deno.test("player_games signup_order is compacted after a withdrawal", async () => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Skipping: no service role key (CI environment)");
    return;
  }

  const db = admin();
  const userIds: string[] = [];
  let createdGameId: string | null = null;

  try {
    for (let i = 0; i < 4; i++) {
      const id = await createUser();
      if (!id) {
        console.log("Skipping: could not create test users");
        return;
      }
      userIds.push(id);
    }

    const { data: game, error: gameError } = await db
      .from("games")
      .insert({
        team1_name: "Black",
        team2_name: "White",
        players_per_team: 6,
        kickoff_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        visible_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (gameError) throw gameError;
    createdGameId = game.id;
    const gameId: string = game.id;

    await db.from("player_games").insert(
      userIds.map((user_id, i) => ({ game_id: gameId, user_id, signup_order: i + 1 })),
    );
    assertEquals(await orders(gameId), [1, 2, 3, 4]);

    // A middle player withdraws: the survivors close the gap.
    await db
      .from("player_games")
      .delete()
      .eq("game_id", gameId)
      .eq("user_id", userIds[1]);
    assertEquals(await orders(gameId), [1, 2, 3]);

    // The first player withdraws: still contiguous from 1.
    await db
      .from("player_games")
      .delete()
      .eq("game_id", gameId)
      .eq("user_id", userIds[0]);
    assertEquals(await orders(gameId), [1, 2]);

    // A bulk delete (e.g. an account deletion cascading across the game)
    // renumbers once, not per row.
    await db.from("player_games").delete().eq("game_id", gameId);
    await db.from("player_games").insert(
      userIds.map((user_id, i) => ({ game_id: gameId, user_id, signup_order: i + 1 })),
    );
    await db
      .from("player_games")
      .delete()
      .eq("game_id", gameId)
      .in("user_id", [userIds[0], userIds[2]]);
    assertEquals(await orders(gameId), [1, 2]);
  } finally {
    if (createdGameId) await db.from("games").delete().eq("id", createdGameId);
    for (const id of userIds) await db.auth.admin.deleteUser(id).catch(() => {});
  }
});
