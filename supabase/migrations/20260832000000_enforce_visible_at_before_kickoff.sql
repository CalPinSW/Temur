-- A game visible only after its own kickoff can never actually be seen by
-- anyone but its admin (getGameVisibilityStatus never flips it to fully
-- visible), which defeats the point of visible_at entirely. Clamp any
-- existing rows that already violate this — visible_at is corrected down to
-- kickoff_date rather than the row being touched in any other way — before
-- adding a CHECK constraint that stops new ones from being created.
UPDATE games
SET visible_at = kickoff_date, updated_at = NOW()
WHERE visible_at > kickoff_date;

ALTER TABLE games ADD CONSTRAINT games_visible_at_before_kickoff_check
  CHECK (visible_at <= kickoff_date);
