-- Group stats: one row per player appearance in a group's played games, for
-- the admin-only stats page. The win/loss/partner/streak maths runs
-- client-side over these rows (computeGroupStats in packages/shared); this
-- function only gathers them, since the per-appearance rating averages sit
-- behind player_ratings' own-rows-only RLS and need SECURITY DEFINER to read.
--
-- Admin-only, matching get_player_rating_summary's admin gate on the same
-- rating aggregates. An appearance is a non-ringer signup that was placed on
-- a team (team IS NOT NULL — the waitlist and anyone left out of a squad
-- didn't play) in a non-deleted game whose kickoff has passed. Games with no
-- result are still included so appearance counts and ratings cover them.

CREATE OR REPLACE FUNCTION public.get_group_stats_appearances(p_group_id UUID)
RETURNS TABLE(
  game_id UUID,
  kickoff_date TIMESTAMPTZ,
  single_team BOOLEAN,
  result_team1_score INTEGER,
  result_team2_score INTEGER,
  result_outcome TEXT,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  team INTEGER,
  average_rating NUMERIC,
  rating_count INTEGER
) AS $$
BEGIN
  IF NOT is_group_admin(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to view this group''s stats';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.kickoff_date,
    g.single_team,
    g.result_team1_score,
    g.result_team2_score,
    g.result_outcome,
    pg.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    pg.team,
    r.average_rating,
    COALESCE(r.rating_count, 0)
  FROM games g
  JOIN player_games pg ON pg.game_id = g.id
  JOIN profiles p ON p.id = pg.user_id
  LEFT JOIN LATERAL (
    SELECT AVG(pr.rating) AS average_rating, COUNT(*)::INTEGER AS rating_count
    FROM player_ratings pr
    WHERE pr.player_game_id = pg.id
  ) r ON true
  WHERE g.group_id = p_group_id
    AND g.deleted_at IS NULL
    AND g.kickoff_date < NOW()
    AND NOT pg.is_ringer
    AND pg.team IS NOT NULL
  ORDER BY g.kickoff_date, pg.signup_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_group_stats_appearances(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_group_stats_appearances(UUID) FROM PUBLIC, anon;
