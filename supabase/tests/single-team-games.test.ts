import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const NO_BACKGROUND_AUTH = { auth: { autoRefreshToken: false, persistSession: false } };
const DAY_MS = 24 * 60 * 60 * 1000;

async function createUser(admin: SupabaseClient): Promise<string | null> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `single-team-test-${Date.now()}-${Math.random()}@example.com`,
    password: "test123456",
    email_confirm: true,
  });
  if (error || !data.user) return null;
  return data.user.id;
}

async function makeGame(
  admin: SupabaseClient,
  fields: Record<string, unknown>
): Promise<{ data: { id: string; single_team: boolean } | null; error: unknown }> {
  const { data, error } = await admin
    .from("games")
    .insert({
      team1_name: "Us",
      team2_name: "Them",
      players_per_team: 7,
      kickoff_date: new Date(Date.now() + 7 * DAY_MS).toISOString(),
      visible_at: new Date().toISOString(),
      ...fields,
    })
    .select("id, single_team")
    .single();
  return { data: data as { id: string; single_team: boolean } | null, error };
}

async function makeGroup(
  admin: SupabaseClient,
  name: string,
  singleTeam: boolean,
  createdBy: string
): Promise<string> {
  const { data } = await admin
    .from("groups")
    .insert({ name, single_team: singleTeam, created_by: createdBy })
    .select("id")
    .single();
  return (data as { id: string }).id;
}

Deno.test("single_team: a group game inherits the group's setting; the setting is permanent", async () => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Skipping: no service role key (CI environment)");
    return;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const userId = await createUser(admin);
  if (!userId) {
    console.log("Skipping: could not create a test user");
    return;
  }

  const groupIds: string[] = [];
  try {
    const leagueGroupId = await makeGroup(admin, `League ${Date.now()}`, true, userId);
    const pickupGroupId = await makeGroup(admin, `Pickup ${Date.now()}`, false, userId);
    groupIds.push(leagueGroupId, pickupGroupId);

    // The BEFORE INSERT trigger forces a group game to match its group,
    // even when the insert says otherwise.
    const { data: leagueGame, error: leagueError } = await makeGame(admin, {
      group_id: leagueGroupId,
      created_by: userId,
      single_team: false,
    });
    assertEquals(leagueError, null);
    assertEquals(leagueGame!.single_team, true);

    const { data: pickupGame } = await makeGame(admin, {
      group_id: pickupGroupId,
      created_by: userId,
      single_team: true,
    });
    assertEquals(pickupGame!.single_team, false);

    // A friend game (no group) keeps whatever the app passed.
    const { data: friendGame } = await makeGame(admin, {
      created_by: userId,
      single_team: true,
    });
    assertEquals(friendGame!.single_team, true);

    // The group setting can't change.
    const { error: groupUpdateError } = await admin
      .from("groups")
      .update({ single_team: false })
      .eq("id", leagueGroupId);
    assert(groupUpdateError !== null, "changing a group's team mode should be rejected");

    // Neither can a game's.
    const { error: gameUpdateError } = await admin
      .from("games")
      .update({ single_team: false })
      .eq("id", leagueGame!.id);
    assert(gameUpdateError !== null, "changing a game's team mode should be rejected");

    // A no-op update (unrelated column) is fine.
    const { error: noopError } = await admin
      .from("groups")
      .update({ name: `League renamed ${Date.now()}` })
      .eq("id", leagueGroupId);
    assertEquals(noopError, null);
  } finally {
    for (const id of groupIds) await admin.from("groups").delete().eq("id", id);
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
});
