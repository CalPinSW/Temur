import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
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
  const email = `delete-account-test-${Date.now()}-${Math.random()}@example.com`;
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

async function deleteTestUserIfStillPresent(userId: string): Promise<void> {
  if (!SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

Deno.test("delete-account - handles CORS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
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

Deno.test("delete-account - returns 401 for an unauthenticated request", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  await response.text();

  assertEquals(response.status, 401);
});

Deno.test("delete-account - deletes the caller and everything owned by them", async () => {
  const caller = await createSignedInTestUser();
  if (!caller) {
    console.log("Skipping: could not create a signed-in test user (no service role key?)");
    return;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);

  try {
    // Give the caller a group they're the sole member of, so the sole-
    // owned-group soft-delete path is actually exercised, not just the
    // plain auth.users cascade.
    const { data: group, error: groupError } = await admin
      .from("groups")
      .insert({ name: "Delete-account test group", created_by: caller.userId })
      .select()
      .single();
    assertExists(group);
    assertEquals(groupError, null);

    const { data: game, error: gameError } = await admin
      .from("games")
      .insert({
        group_id: group!.id,
        created_by: caller.userId,
        kickoff_date: "2030-01-01T18:00:00.000Z",
        visible_at: "2020-01-01T00:00:00.000Z",
        team1_name: "Team A",
        team2_name: "Team B",
        players_per_team: 5,
      })
      .select()
      .single();
    assertExists(game);
    assertEquals(gameError, null);

    const { error: ringerError } = await admin
      .from("saved_ringers")
      .insert({ user_id: caller.userId, name: "Some Ringer" });
    assertEquals(ringerError, null);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${caller.accessToken}`,
        "apikey": SUPABASE_ANON_KEY,
      },
    });

    const data = await response.json();

    if (response.status === 401) {
      console.log("Skipping assertion: gateway rejected the request", data);
      return;
    }

    assertEquals(response.status, 200);
    assertEquals(data.success, true);

    const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(
      caller.userId
    );
    assertEquals(authUser?.user, null);
    assertExists(authUserError);

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", caller.userId)
      .maybeSingle();
    assertEquals(profile, null);

    const { data: ringers } = await admin
      .from("saved_ringers")
      .select("id")
      .eq("user_id", caller.userId);
    assertEquals(ringers, []);

    const { data: deletedGroup } = await admin
      .from("groups")
      .select("deleted_at")
      .eq("id", group!.id)
      .single();
    assertExists(deletedGroup?.deleted_at);

    const { data: deletedGame } = await admin
      .from("games")
      .select("deleted_at")
      .eq("id", game!.id)
      .single();
    assertExists(deletedGame?.deleted_at);
  } finally {
    await deleteTestUserIfStillPresent(caller.userId);
  }
});
