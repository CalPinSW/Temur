-- Aggregated player rating averages/counts are now admin-only. Previously
-- any authenticated user could read every player's average via
-- get_player_rating_summary (SECURITY DEFINER, granted to `authenticated`
-- with no check on the caller). Restrict it to a game's admins — the
-- creator of a friend game, or any admin of the game's group — reusing
-- is_game_admin, the same check the rest of the app's admin UI is gated on.
--
-- Rating *entry* is unchanged: every player who played can still upsert
-- into player_ratings and read back their own rows (auth.uid() = rated_by
-- from 20260817000000). Only the aggregate readback is narrowed here.

CREATE OR REPLACE FUNCTION public.get_player_rating_summary(p_player_game_ids UUID[])
RETURNS TABLE(player_game_id UUID, average_rating NUMERIC, rating_count INTEGER)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT pr.player_game_id, AVG(pr.rating), COUNT(*)::INTEGER
  FROM player_ratings pr
  JOIN player_games pg ON pg.id = pr.player_game_id
  WHERE pr.player_game_id = ANY(p_player_game_ids)
    AND public.is_game_admin(pg.game_id, auth.uid())
  GROUP BY pr.player_game_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_rating_summary(UUID[]) TO authenticated;
