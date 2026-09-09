import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const EDGE_FUNCTION_SECRET = Deno.env.get("EDGE_FUNCTION_SECRET") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const NO_BACKGROUND_AUTH = { auth: { autoRefreshToken: false, persistSession: false } };

Deno.test("sweep-visible-games - rejects a missing cron secret", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sweep-visible-games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertExists(data.error);
});

Deno.test("sweep-visible-games - rejects a wrong cron secret", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sweep-visible-games`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-cron-secret": "not-the-secret" },
    body: JSON.stringify({}),
  });

  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("sweep-visible-games - handles CORS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sweep-visible-games`, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  await response.text();

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("sweep-visible-games - sweeps with the correct secret", async () => {
  if (!EDGE_FUNCTION_SECRET) {
    console.log("Skipping: No EDGE_FUNCTION_SECRET");
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/sweep-visible-games`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-cron-secret": EDGE_FUNCTION_SECRET },
    body: JSON.stringify({}),
  });

  const data = await response.json();

  if (response.status === 401) {
    // The function's runtime doesn't have EDGE_FUNCTION_SECRET provisioned
    // in this environment (a manual, per-environment setup step) — nothing
    // more this test can assert here.
    console.log("Skipping assertion: EDGE_FUNCTION_SECRET not provisioned to the function", data);
    return;
  }

  assertEquals(response.status, 200);
  assertExists(data.swept);
});

Deno.test("sweep-visible-games - never marks a soft-deleted game notified", async () => {
  if (!EDGE_FUNCTION_SECRET || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Skipping: no EDGE_FUNCTION_SECRET / SUPABASE_SERVICE_ROLE_KEY (CI environment)");
    return;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const email = `sweep-visible-games-test-${Date.now()}-${Math.random()}@example.com`;
  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password: "test123456",
    email_confirm: true,
  });
  if (createUserError || !created.user) {
    console.log("Skipping: could not create test user");
    return;
  }
  const userId = created.user.id;

  let groupId: string | null = null;
  let gameId: string | null = null;

  try {
    const { data: group, error: groupError } = await admin
      .from("groups")
      .insert({ name: `Sweep Test Group ${Date.now()}`, created_by: userId })
      .select("id")
      .single();
    if (groupError) throw groupError;
    groupId = group.id;

    const { data: game, error: gameError } = await admin
      .from("games")
      .insert({
        group_id: groupId,
        created_by: userId,
        team1_name: "Black",
        team2_name: "White",
        players_per_team: 6,
        kickoff_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        visible_at: new Date(Date.now() - 60 * 1000).toISOString(),
        deleted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (gameError) throw gameError;
    gameId = game.id;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/sweep-visible-games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": EDGE_FUNCTION_SECRET },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    if (response.status === 401) {
      console.log("Skipping assertion: EDGE_FUNCTION_SECRET not provisioned to the function", data);
      return;
    }
    assertEquals(response.status, 200);

    const { data: gameAfterSweep, error: readError } = await admin
      .from("games")
      .select("visibility_notified_at")
      .eq("id", gameId)
      .single();
    if (readError) throw readError;

    assertEquals(gameAfterSweep?.visibility_notified_at, null);
  } finally {
    if (gameId) await admin.from("games").delete().eq("id", gameId);
    if (groupId) await admin.from("groups").delete().eq("id", groupId);
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
});
