import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const NO_BACKGROUND_AUTH = { auth: { autoRefreshToken: false, persistSession: false } };
const DAY_MS = 24 * 60 * 60 * 1000;

async function createSignedInUser(
  admin: SupabaseClient
): Promise<{ userId: string; client: SupabaseClient } | null> {
  const email = `group-stats-test-${Date.now()}-${Math.random()}@example.com`;
  const password = "test123456";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) return null;

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, NO_BACKGROUND_AUTH);
  const { data: signedIn } = await anon.auth.signInWithPassword({ email, password });
  if (!signedIn.session) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...NO_BACKGROUND_AUTH,
    global: { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } },
  });
  return { userId: data.user.id, client };
}

Deno.test(
  "get_group_stats_appearances - admin-only; returns team-assigned, non-ringer appearances in past games with rating aggregates",
  async () => {
    if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      console.log("Skipping: no service role / anon key (CI environment)");
      return;
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
    const groupAdmin = await createSignedInUser(admin);
    const member = await createSignedInUser(admin);
    const benched = await createSignedInUser(admin);
    if (!groupAdmin || !member || !benched) {
      console.log("Skipping: could not create signed-in test users");
      return;
    }

    let groupId: string | null = null;
    try {
      const { data: group, error: groupError } = await admin
        .from("groups")
        .insert({ name: `Stats ${Date.now()}`, created_by: groupAdmin.userId })
        .select("id")
        .single();
      if (groupError) throw groupError;
      groupId = group.id;

      await admin.from("group_members").upsert(
        [
          { group_id: groupId, user_id: groupAdmin.userId, role: "admin" },
          { group_id: groupId, user_id: member.userId, role: "member" },
          { group_id: groupId, user_id: benched.userId, role: "member" },
        ],
        { onConflict: "group_id,user_id" }
      );

      const past = new Date(Date.now() - 2 * DAY_MS).toISOString();
      const future = new Date(Date.now() + 2 * DAY_MS).toISOString();
      const gameFields = {
        group_id: groupId,
        created_by: groupAdmin.userId,
        team1_name: "Black",
        team2_name: "White",
        players_per_team: 5,
        visible_at: new Date(Date.now() - 3 * DAY_MS).toISOString(),
      };

      const insertGame = async (fields: Record<string, unknown>) => {
        const { data, error } = await admin
          .from("games")
          .insert({ ...gameFields, ...fields })
          .select("id")
          .single();
        if (error) throw error;
        return data as { id: string };
      };
      const playedGame = await insertGame({
        kickoff_date: past,
        result_team1_score: 4,
        result_team2_score: 2,
      });
      const futureGame = await insertGame({
        kickoff_date: future,
        visible_at: new Date().toISOString(),
      });
      const deletedGame = await insertGame({
        kickoff_date: past,
        deleted_at: new Date().toISOString(),
      });

      const { data: playerGames, error: pgError } = await admin
        .from("player_games")
        .insert([
          { game_id: playedGame.id, user_id: groupAdmin.userId, signup_order: 1, team: 1 },
          { game_id: playedGame.id, user_id: member.userId, signup_order: 2, team: 2 },
          { game_id: playedGame.id, user_id: benched.userId, signup_order: 3, team: null },
          { game_id: futureGame.id, user_id: groupAdmin.userId, signup_order: 1, team: 1 },
          { game_id: deletedGame.id, user_id: groupAdmin.userId, signup_order: 1, team: 1 },
        ])
        .select("id, game_id, user_id");
      if (pgError) throw pgError;

      const { error: ringerError } = await admin.from("player_games").insert({
        game_id: playedGame.id,
        user_id: null,
        signup_order: 4,
        team: 1,
        is_ringer: true,
        guest_name: "Guest",
        added_by: groupAdmin.userId,
      });
      if (ringerError) throw ringerError;

      const adminPg = playerGames.find(
        (pg) => pg.game_id === playedGame.id && pg.user_id === groupAdmin.userId
      )!;
      await admin.from("player_ratings").insert([
        { player_game_id: adminPg.id, rated_by: member.userId, rating: 8 },
        { player_game_id: adminPg.id, rated_by: benched.userId, rating: 6 },
      ]);

      const { data: rows, error } = await groupAdmin.client.rpc("get_group_stats_appearances", {
        p_group_id: groupId,
      });
      assertEquals(error, null);
      assertEquals(rows.length, 2);

      const adminRow = rows.find((r: { user_id: string }) => r.user_id === groupAdmin.userId);
      assertEquals(adminRow.game_id, playedGame.id);
      assertEquals(adminRow.team, 1);
      assertEquals(adminRow.result_team1_score, 4);
      assertEquals(Number(adminRow.average_rating), 7);
      assertEquals(adminRow.rating_count, 2);

      const memberRow = rows.find((r: { user_id: string }) => r.user_id === member.userId);
      assertEquals(memberRow.team, 2);
      assertEquals(memberRow.average_rating, null);
      assertEquals(memberRow.rating_count, 0);

      const { data: memberRows, error: memberError } = await member.client.rpc(
        "get_group_stats_appearances",
        { p_group_id: groupId }
      );
      assert(memberError, "a non-admin member must be refused");
      assertEquals(memberRows, null);
    } finally {
      if (groupId) {
        await admin.from("games").delete().eq("group_id", groupId);
        await admin.from("groups").delete().eq("id", groupId);
      }
      for (const user of [groupAdmin, member, benched]) {
        await admin.auth.admin.deleteUser(user.userId).catch(() => {});
      }
    }
  }
);
