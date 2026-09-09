-- Single-team games: a group that runs one team in a league (fixed squad,
-- plays an external opponent) rather than splitting itself into two teams
-- each game. The mode is a permanent group setting; friend games (no
-- group) choose it per game.
--
-- For a single-team game: capacity is players_per_team (the squad size,
-- not doubled), there is no team-assignment step, team2_name holds the
-- opponent's name, and the tactics board is a single-pitch lineup board.
-- Everything else (sign-ups, waitlist, ringers, invites, join links,
-- recurring blocks, results, ratings, notifications) is unchanged.

ALTER TABLE groups ADD COLUMN single_team BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE games  ADD COLUMN single_team BOOLEAN NOT NULL DEFAULT false;

-- A group's team mode is chosen at creation and can never change — every
-- game in it (past and future) assumes one or the other.
CREATE OR REPLACE FUNCTION public.prevent_group_single_team_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.single_team <> OLD.single_team THEN
    RAISE EXCEPTION 'A group''s team mode cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER groups_single_team_immutable
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION prevent_group_single_team_change();

-- A group game's single_team always mirrors its group — the app sets it
-- explicitly, this is defence in depth (and covers the create_game_series
-- RPC's inserts with no RPC change). Friend games (group_id NULL) keep
-- whatever the create-game form passed.
CREATE OR REPLACE FUNCTION public.set_game_single_team_from_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    SELECT single_team INTO NEW.single_team FROM groups WHERE id = NEW.group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_single_team_from_group
  BEFORE INSERT ON games
  FOR EACH ROW EXECUTE FUNCTION set_game_single_team_from_group();

-- Nothing writes games.single_team on update today; keep it that way.
CREATE OR REPLACE FUNCTION public.prevent_game_single_team_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.single_team <> OLD.single_team THEN
    RAISE EXCEPTION 'A game''s team mode cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_single_team_immutable
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION prevent_game_single_team_change();
