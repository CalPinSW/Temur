-- player_games.added_by is ON DELETE SET NULL against profiles, but the
-- ringer-shape check from 20260815000000_add_ringers.sql required
-- added_by IS NOT NULL whenever is_ringer = true. When a user who had
-- added a ringer was deleted, Postgres nulled out added_by on that row
-- and immediately violated the CHECK constraint, causing the delete to
-- fail with a generic "Database error deleting user" from Supabase Auth.
--
-- Fix: allow added_by to be NULL on ringer rows. The ringer becomes
-- "orphaned" (only a game admin can remove it — see the existing
-- "Ringer adder or game admin can remove a ringer" DELETE policy, whose
-- `added_by = auth.uid()` clause is simply never true for an orphaned
-- row) but the row and the ringer's spot in the game are preserved.
ALTER TABLE player_games DROP CONSTRAINT player_games_ringer_shape_check;

ALTER TABLE player_games ADD CONSTRAINT player_games_ringer_shape_check CHECK (
  (is_ringer AND user_id IS NULL AND guest_name IS NOT NULL)
  OR
  (NOT is_ringer AND user_id IS NOT NULL AND guest_name IS NULL)
);
