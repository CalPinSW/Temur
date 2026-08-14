-- Individual player ratings are personal: only the person who gave a rating
-- should be able to read that row back (e.g. to prefill their own form).
-- The average/count shown to everyone else must keep working, so it's now
-- served by a SECURITY DEFINER aggregate that bypasses the tighter RLS.

DROP POLICY IF EXISTS "Player ratings are viewable by authenticated users" ON player_ratings;

CREATE POLICY "Users can view their own ratings"
  ON player_ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = rated_by);

CREATE OR REPLACE FUNCTION public.get_player_rating_summary(p_player_game_ids UUID[])
RETURNS TABLE(player_game_id UUID, average_rating NUMERIC, rating_count INTEGER)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT player_ratings.player_game_id, AVG(rating), COUNT(*)::INTEGER
  FROM player_ratings
  WHERE player_ratings.player_game_id = ANY(p_player_game_ids)
  GROUP BY player_ratings.player_game_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_rating_summary(UUID[]) TO authenticated;
