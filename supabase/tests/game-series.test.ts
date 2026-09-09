import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const NO_BACKGROUND_AUTH = { auth: { autoRefreshToken: false, persistSession: false } };
const DAY_MS = 24 * 60 * 60 * 1000;

async function createSignedInTestUser(): Promise<
  { userId: string; accessToken: string } | null
> {
  if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) return null;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const email = `game-series-test-${Date.now()}-${Math.random()}@example.com`;
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

const weekly = (weeks: number, atHour = 10) => {
  const kickoffs: string[] = [];
  const visibleAts: string[] = [];
  const first = new Date();
  first.setHours(atHour, 0, 0, 0);
  first.setDate(first.getDate() + 7); // first kickoff a week out
  for (let i = 0; i < weeks; i++) {
    const k = new Date(first.getTime() + i * 7 * DAY_MS);
    kickoffs.push(k.toISOString());
    visibleAts.push(new Date(k.getTime() - 6 * DAY_MS).toISOString());
  }
  return { kickoffs, visibleAts };
};

Deno.test("create_game_series - a group admin schedules a block of games", async () => {
  if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    console.log("Skipping: no service role / anon key (CI environment)");
    return;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const groupAdmin = await createSignedInTestUser();
  const member = await createSignedInTestUser();
  if (!groupAdmin || !member) {
    console.log("Skipping: could not create signed-in test users");
    return;
  }

  let groupId: string | null = null;
  try {
    const { data: group, error: groupError } = await admin
      .from("groups")
      .insert({ name: `Series Group ${Date.now()}`, created_by: groupAdmin.userId })
      .select("id")
      .single();
    if (groupError) throw groupError;
    groupId = group.id;

    await admin
      .from("group_members")
      .insert({ group_id: groupId, user_id: member.userId, role: "member" });

    const { kickoffs, visibleAts } = weekly(6);

    // A plain member cannot schedule a block.
    const { error: memberError } = await clientAs(member.accessToken).rpc("create_game_series", {
      p_group_id: groupId,
      p_interval_weeks: 1,
      p_kickoffs: kickoffs,
      p_visible_ats: visibleAts,
      p_team1_name: "Black",
      p_team2_name: "White",
      p_players_per_team: 6,
    });
    assert(memberError !== null, "a non-admin member should be rejected");

    // The admin can.
    const { data: createdData, error: createError } = await clientAs(groupAdmin.accessToken)
      .rpc("create_game_series", {
        p_group_id: groupId,
        p_interval_weeks: 1,
        p_kickoffs: kickoffs,
        p_visible_ats: visibleAts,
        p_team1_name: "Black",
        p_team2_name: "White",
        p_players_per_team: 6,
      })
      .single();
    assertEquals(createError, null);
    const created = createdData as { series_id: string; games_created: number };
    assertEquals(created.games_created, 6);

    const { data: games } = await admin
      .from("games")
      .select("kickoff_date, visible_at, series_id, team1_name, players_per_team")
      .eq("series_id", created.series_id)
      .order("kickoff_date", { ascending: true });

    assertEquals(games?.length, 6);
    assertEquals(games?.[0].team1_name, "Black");
    assertEquals(games?.[0].players_per_team, 6);
    // One week apart, visible_at six days before each kickoff.
    for (let i = 0; i < 6; i++) {
      assertEquals(games?.[i].kickoff_date, kickoffs[i]);
      assertEquals(games?.[i].visible_at, visibleAts[i]);
    }

    // Below the minimum of 2 is rejected.
    const { error: tooFewError } = await clientAs(groupAdmin.accessToken).rpc("create_game_series", {
      p_group_id: groupId,
      p_interval_weeks: 1,
      p_kickoffs: [kickoffs[0]],
      p_visible_ats: [visibleAts[0]],
      p_team1_name: "Black",
      p_team2_name: "White",
      p_players_per_team: 6,
    });
    assert(tooFewError !== null, "a one-game block should be rejected");
  } finally {
    if (groupId) await admin.from("groups").delete().eq("id", groupId);
    await deleteTestUser(groupAdmin.userId);
    await deleteTestUser(member.userId);
  }
});

Deno.test("update_game_series_future / cancel_game_series - only touch upcoming games", async () => {
  if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    console.log("Skipping: no service role / anon key (CI environment)");
    return;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const groupAdmin = await createSignedInTestUser();
  if (!groupAdmin) {
    console.log("Skipping: could not create signed-in test user");
    return;
  }

  let groupId: string | null = null;
  try {
    const { data: group } = await admin
      .from("groups")
      .insert({ name: `Series Edit Group ${Date.now()}`, created_by: groupAdmin.userId })
      .select("id")
      .single();
    groupId = group!.id;

    const { data: seriesRow } = await admin
      .from("game_series")
      .insert({ group_id: groupId, created_by: groupAdmin.userId, interval_weeks: 1 })
      .select("id")
      .single();
    const seriesId = seriesRow!.id;

    // One game last week (played), two upcoming.
    const past = new Date(Date.now() - 3 * DAY_MS);
    const soon = new Date(Date.now() + 4 * DAY_MS);
    const later = new Date(Date.now() + 11 * DAY_MS);
    const { data: inserted } = await admin
      .from("games")
      .insert(
        [past, soon, later].map((k) => ({
          group_id: groupId,
          created_by: groupAdmin.userId,
          series_id: seriesId,
          team1_name: "Black",
          team2_name: "White",
          players_per_team: 6,
          kickoff_date: k.toISOString(),
          visible_at: new Date(k.getTime() - 6 * DAY_MS).toISOString(),
        }))
      )
      .select("id, kickoff_date");
    const pastGameId = inserted!.find((g) => new Date(g.kickoff_date) < new Date())!.id;

    const upcomingIds = inserted!
      .filter((g) => new Date(g.kickoff_date) >= new Date())
      .map((g) => g.id);
    const upcomingKickoffs = [soon, later].map((k) => {
      const d = new Date(k);
      d.setHours(19, 30, 0, 0);
      return d.toISOString();
    });

    const groupAdminClient = clientAs(groupAdmin.accessToken);
    const { data: updatedCount, error: updateError } = await groupAdminClient.rpc(
      "update_game_series_future",
      {
        p_series_id: seriesId,
        p_game_ids: upcomingIds,
        p_kickoffs: upcomingKickoffs,
        p_visible_ats: upcomingKickoffs.map((k) =>
          new Date(new Date(k).getTime() - 6 * DAY_MS).toISOString()
        ),
        p_team1_name: "Reds",
        p_team2_name: "Blues",
        p_players_per_team: 7,
        p_game_description: "Weekly kickabout",
      }
    );
    assertEquals(updateError, null);
    assertEquals(updatedCount, 2);

    const { data: afterUpdate } = await admin
      .from("games")
      .select("id, team1_name, players_per_team")
      .eq("series_id", seriesId);
    const pastAfter = afterUpdate!.find((g) => g.id === pastGameId)!;
    assertEquals(pastAfter.team1_name, "Black"); // untouched
    assertEquals(pastAfter.players_per_team, 6);
    for (const g of afterUpdate!.filter((g) => g.id !== pastGameId)) {
      assertEquals(g.team1_name, "Reds");
      assertEquals(g.players_per_team, 7);
    }

    // Cancel: upcoming games soft-deleted, past game and series marked accordingly.
    const { data: cancelledCount, error: cancelError } = await groupAdminClient.rpc(
      "cancel_game_series",
      { p_series_id: seriesId }
    );
    assertEquals(cancelError, null);
    assertEquals(cancelledCount, 2);

    const { data: postCancel } = await admin
      .from("games")
      .select("id, deleted_at")
      .eq("series_id", seriesId);
    for (const g of postCancel!) {
      if (g.id === pastGameId) assertEquals(g.deleted_at, null);
      else assert(g.deleted_at !== null, "upcoming games should be soft-deleted");
    }

    const { data: seriesAfter } = await admin
      .from("game_series")
      .select("deleted_at")
      .eq("id", seriesId)
      .single();
    assert(seriesAfter!.deleted_at !== null, "the series row should be marked deleted");
  } finally {
    if (groupId) await admin.from("groups").delete().eq("id", groupId);
    await deleteTestUser(groupAdmin.userId);
  }
});
