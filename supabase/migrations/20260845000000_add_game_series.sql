-- Recurring game blocks ("series"): a group admin schedules a whole fixture
-- run at once — first kickoff, repeat every 1-4 weeks, until an end date —
-- instead of creating each game by hand. Every generated game is an
-- ordinary group game (same group_id, same RLS, its own visible_at so the
-- existing sweep-visible-games cron notifies each one as it opens); the
-- series row just links them so an admin can edit all upcoming games at
-- once or cancel the rest of the block.

CREATE TABLE game_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  interval_weeks INT NOT NULL CHECK (interval_weeks BETWEEN 1 AND 4),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_series_group_id ON game_series(group_id);

-- ON DELETE SET NULL (matches games.created_by): a game outlives its series
-- row. Nothing in either app hard-deletes a series, but a hard delete of
-- the group cascades the series away while leaving its games soft-deleted
-- by delete_group.
ALTER TABLE games ADD COLUMN series_id UUID REFERENCES game_series(id) ON DELETE SET NULL;
CREATE INDEX idx_games_series_id ON games(series_id) WHERE series_id IS NOT NULL;

CREATE TRIGGER update_game_series_updated_at
  BEFORE UPDATE ON game_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE game_series ENABLE ROW LEVEL SECURITY;

-- Readable by group members (so a game's detail page can show "part of a
-- recurring block"); excludes soft-deleted series. All writes go through
-- the SECURITY DEFINER RPCs below, so there is deliberately no INSERT /
-- UPDATE / DELETE policy — same pattern as game_join_links / group_join_links.
CREATE POLICY "Game series are viewable by group members"
  ON game_series FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND is_group_member(group_id, auth.uid()));

-- Hard cap on how many games one block can create, enforced here and
-- mirrored by MAX_SERIES_GAMES in packages/shared.
CREATE OR REPLACE FUNCTION public.max_game_series_games()
RETURNS INT AS $$ SELECT 26 $$ LANGUAGE sql IMMUTABLE;

-- ============================================
-- create_game_series
-- ============================================
-- Kickoff / visible-at timestamps are generated client-side (generateSeriesKickoffs
-- + getDefaultVisibleAt per element) and passed as parallel arrays, so the
-- form's live preview and the actual insert use identical date logic and
-- there is zero timezone maths in SQL.
CREATE OR REPLACE FUNCTION public.create_game_series(
  p_group_id UUID,
  p_interval_weeks INT,
  p_kickoffs TIMESTAMPTZ[],
  p_visible_ats TIMESTAMPTZ[],
  p_team1_name TEXT,
  p_team2_name TEXT,
  p_players_per_team INT
)
RETURNS TABLE (series_id UUID, games_created INT) AS $$
DECLARE
  v_series_id UUID;
  v_count INT;
BEGIN
  IF NOT is_group_admin(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to schedule games for this group';
  END IF;

  IF p_interval_weeks IS NULL OR p_interval_weeks < 1 OR p_interval_weeks > 4 THEN
    RAISE EXCEPTION 'Repeat interval must be between 1 and 4 weeks';
  END IF;

  v_count := coalesce(array_length(p_kickoffs, 1), 0);

  IF v_count <> coalesce(array_length(p_visible_ats, 1), 0) THEN
    RAISE EXCEPTION 'Kickoff and visible-from lists must be the same length';
  END IF;

  IF v_count < 2 THEN
    RAISE EXCEPTION 'A recurring block needs at least 2 games';
  END IF;

  IF v_count > max_game_series_games() THEN
    RAISE EXCEPTION 'A recurring block can have at most % games', max_game_series_games();
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(p_kickoffs, p_visible_ats) AS t(kickoff, visible_at)
    WHERE t.visible_at > t.kickoff
  ) THEN
    RAISE EXCEPTION '"Visible from" must be on or before each kickoff';
  END IF;

  INSERT INTO game_series (group_id, created_by, interval_weeks)
  VALUES (p_group_id, auth.uid(), p_interval_weeks)
  RETURNING id INTO v_series_id;

  INSERT INTO games (
    group_id, created_by, series_id,
    kickoff_date, visible_at,
    team1_name, team2_name, players_per_team
  )
  SELECT
    p_group_id, auth.uid(), v_series_id,
    t.kickoff, t.visible_at,
    p_team1_name, p_team2_name, p_players_per_team
  FROM unnest(p_kickoffs, p_visible_ats) AS t(kickoff, visible_at);

  RETURN QUERY SELECT v_series_id, v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- update_game_series_future
-- ============================================
-- The client passes the ids of the series' upcoming, non-deleted games and
-- each one's recomputed kickoff/visible (its own date kept, the new
-- wall-clock time applied in JS). The trailing WHERE conditions re-check
-- the list server-side so a stale or hostile client can't touch past games,
-- deleted games, or games in another series.
CREATE OR REPLACE FUNCTION public.update_game_series_future(
  p_series_id UUID,
  p_game_ids UUID[],
  p_kickoffs TIMESTAMPTZ[],
  p_visible_ats TIMESTAMPTZ[],
  p_team1_name TEXT,
  p_team2_name TEXT,
  p_players_per_team INT,
  p_game_description TEXT
)
RETURNS INT AS $$
DECLARE
  v_group_id UUID;
  v_updated INT;
BEGIN
  SELECT group_id INTO v_group_id
  FROM game_series WHERE id = p_series_id AND deleted_at IS NULL;

  IF v_group_id IS NULL OR NOT is_group_admin(v_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to update this recurring block';
  END IF;

  IF coalesce(array_length(p_game_ids, 1), 0) <> coalesce(array_length(p_kickoffs, 1), 0)
     OR coalesce(array_length(p_game_ids, 1), 0) <> coalesce(array_length(p_visible_ats, 1), 0) THEN
    RAISE EXCEPTION 'Game id, kickoff and visible-from lists must be the same length';
  END IF;

  UPDATE games g
  SET team1_name = p_team1_name,
      team2_name = p_team2_name,
      players_per_team = p_players_per_team,
      game_description = p_game_description,
      kickoff_date = u.kickoff,
      visible_at = u.visible_at,
      updated_at = NOW()
  FROM unnest(p_game_ids, p_kickoffs, p_visible_ats) AS u(game_id, kickoff, visible_at)
  WHERE g.id = u.game_id
    AND g.series_id = p_series_id
    AND g.deleted_at IS NULL
    AND g.kickoff_date >= NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- cancel_game_series
-- ============================================
-- Soft-deletes the block's *upcoming* games only (past ones happened) and
-- marks the series done. Same soft-delete mechanism as delete_game — the
-- games vanish from every read via can_view_game, no recovery UI.
CREATE OR REPLACE FUNCTION public.cancel_game_series(p_series_id UUID)
RETURNS INT AS $$
DECLARE
  v_group_id UUID;
  v_cancelled INT;
BEGIN
  SELECT group_id INTO v_group_id
  FROM game_series WHERE id = p_series_id AND deleted_at IS NULL;

  IF v_group_id IS NULL OR NOT is_group_admin(v_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to cancel this recurring block';
  END IF;

  UPDATE games
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE series_id = p_series_id
    AND deleted_at IS NULL
    AND kickoff_date >= NOW();

  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  UPDATE game_series SET deleted_at = NOW(), updated_at = NOW() WHERE id = p_series_id;

  RETURN v_cancelled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.max_game_series_games() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_game_series(UUID, INT, TIMESTAMPTZ[], TIMESTAMPTZ[], TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_game_series_future(UUID, UUID[], TIMESTAMPTZ[], TIMESTAMPTZ[], TEXT, TEXT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_game_series(UUID) TO authenticated;
