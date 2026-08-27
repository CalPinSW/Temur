-- Keep player_games.signup_order gap-free per game.
--
-- signup_order is what getActivePlayers/getWaitlistPlayers (packages/shared)
-- use to decide who is "in" vs waitlisted: signup_order <= players_per_team*2
-- is active, above it is waitlisted. Withdrawals and ringer removals were
-- plain DELETEs that left the vacated number behind, and getNextSignupOrder
-- hands out max(signup_order)+1, so gaps never healed and compounded. Once a
-- gap opened below capacity, the tail player's signup_order exceeded capacity
-- and they showed as waitlisted even though the game wasn't full — while the
-- games list (a raw row count) still said the game had capacity players.
--
-- Fix it at the source: an AFTER DELETE trigger renumbers the survivors of
-- each affected game to 1..N by their existing order.

-- The renumber is a single ripple UPDATE (n -> n-1 across a run of rows).
-- A non-deferrable UNIQUE constraint checks per row and would trip on the
-- transient collision mid-statement; DEFERRABLE INITIALLY IMMEDIATE moves
-- the check to end-of-statement without deferring to commit.
ALTER TABLE player_games
  DROP CONSTRAINT player_games_game_id_signup_order_key,
  ADD CONSTRAINT player_games_game_id_signup_order_key
    UNIQUE (game_id, signup_order) DEFERRABLE INITIALLY IMMEDIATE;

CREATE OR REPLACE FUNCTION public.compact_signup_order_after_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  WITH affected_games AS (
    SELECT DISTINCT game_id FROM old_player_games
  ),
  renumbered AS (
    SELECT
      pg.id,
      ROW_NUMBER() OVER (PARTITION BY pg.game_id ORDER BY pg.signup_order) AS new_order
    FROM public.player_games pg
    JOIN affected_games ag ON ag.game_id = pg.game_id
  )
  UPDATE public.player_games pg
  SET signup_order = r.new_order
  FROM renumbered r
  WHERE pg.id = r.id
    AND pg.signup_order <> r.new_order;

  RETURN NULL;
END;
$$;

-- Statement-level with a transition table so a bulk delete (a signed-up
-- user's account deletion cascading across many games) renumbers each
-- affected game exactly once. AFTER DELETE doing an UPDATE can't re-fire
-- this trigger, so no recursion guard is needed.
CREATE TRIGGER compact_signup_order_after_delete
  AFTER DELETE ON player_games
  REFERENCING OLD TABLE AS old_player_games
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.compact_signup_order_after_delete();

-- Backfill: close every gap that has already accumulated in production.
WITH renumbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY game_id ORDER BY signup_order) AS new_order
  FROM player_games
)
UPDATE player_games pg
SET signup_order = r.new_order
FROM renumbered r
WHERE pg.id = r.id
  AND pg.signup_order <> r.new_order;
