-- Game results: a win/loss/draw outcome or a specific scoreline, entered
-- after kickoff. Anyone who can view the game may enter or update it (not
-- just the game admin), so this goes through set_game_result() rather than
-- a general games UPDATE policy, which would also open up admin-only fields
-- like kickoff_date and team names to every viewer.

ALTER TABLE games ADD COLUMN result_team1_score INTEGER;
ALTER TABLE games ADD COLUMN result_team2_score INTEGER;
ALTER TABLE games ADD COLUMN result_outcome TEXT CHECK (result_outcome IN ('team1_win', 'team2_win', 'draw'));

-- A result is either a scoreline (both scores set, no outcome) or an
-- outcome (no scores) — never both, never one score without the other.
ALTER TABLE games ADD CONSTRAINT games_result_shape_check CHECK (
  (result_team1_score IS NULL) = (result_team2_score IS NULL)
  AND (result_outcome IS NULL OR (result_team1_score IS NULL AND result_team2_score IS NULL))
);

CREATE OR REPLACE FUNCTION public.set_game_result(
  p_game_id UUID,
  p_team1_score INTEGER,
  p_team2_score INTEGER,
  p_outcome TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT can_view_game(p_game_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to update this game';
  END IF;

  UPDATE games
  SET result_team1_score = p_team1_score,
      result_team2_score = p_team2_score,
      result_outcome = p_outcome,
      updated_at = NOW()
  WHERE id = p_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_game_result(UUID, INTEGER, INTEGER, TEXT) TO authenticated;

-- Ratings were never actually constrained to the 1-10 scale the UI promises.
ALTER TABLE player_ratings ADD CONSTRAINT player_ratings_rating_range_check CHECK (rating BETWEEN 1 AND 10);
