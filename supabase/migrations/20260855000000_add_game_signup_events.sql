-- Game signup audit log: an append-only history of who joined or left each
-- game and when, readable only by that game's admins.
--
-- player_games only holds the current squad — a withdrawal is a plain
-- DELETE, so once someone pulls out there's no trace they were ever signed
-- up. Rows here are written exclusively by triggers on player_games, so
-- every path that adds or removes a signup (self signup/withdrawal, ringer
-- add/remove, an admin removing a member, account deletion) is captured
-- without any client or RPC having to remember to log it.

CREATE TABLE game_signup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('joined', 'withdrew', 'removed', 'ringer_added', 'ringer_removed', 'account_deleted')
  ),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Whether the signup sat beyond capacity (on the waitlist) at the moment
  -- of the event. NULL for backfilled rows, where it can't be known.
  waitlisted BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_signup_events_game_id_created_at
  ON game_signup_events(game_id, created_at DESC);

ALTER TABLE game_signup_events ENABLE ROW LEVEL SECURITY;

-- Read-only for game admins. No INSERT/UPDATE/DELETE policies on purpose:
-- only the SECURITY DEFINER triggers below write here, so the log can't be
-- edited or forged from a client.
CREATE POLICY "Game admins can view signup events"
  ON game_signup_events FOR SELECT
  TO authenticated
  USING (is_game_admin(game_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.is_beyond_game_capacity(p_game_id UUID, p_signup_order INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT p_signup_order > CASE WHEN g.single_team THEN g.players_per_team ELSE g.players_per_team * 2 END
  FROM public.games g
  WHERE g.id = p_game_id;
$$;

REVOKE EXECUTE ON FUNCTION public.is_beyond_game_capacity(UUID, INTEGER) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_player_game_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.game_signup_events (game_id, event_type, user_id, guest_name, actor_id, waitlisted)
  VALUES (
    NEW.game_id,
    CASE WHEN NEW.is_ringer THEN 'ringer_added' ELSE 'joined' END,
    NEW.user_id,
    NEW.guest_name,
    COALESCE(auth.uid(), NEW.added_by, NEW.user_id),
    public.is_beyond_game_capacity(NEW.game_id, NEW.signup_order)
  );
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_player_game_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_profile_exists BOOLEAN;
BEGIN
  -- The game itself is being hard-deleted (its events cascade away with it).
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = OLD.game_id) THEN
    RETURN NULL;
  END IF;

  -- Account deletion cascades auth.users -> profiles -> player_games, so by
  -- the time this fires the player's profile is already gone and can't be
  -- referenced; record the departure anonymously instead.
  v_profile_exists := OLD.user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.user_id);

  IF v_actor IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor) THEN
    v_actor := NULL;
  END IF;

  INSERT INTO public.game_signup_events (game_id, event_type, user_id, guest_name, actor_id, waitlisted)
  VALUES (
    OLD.game_id,
    CASE
      WHEN OLD.is_ringer THEN 'ringer_removed'
      WHEN NOT v_profile_exists THEN 'account_deleted'
      WHEN v_actor = OLD.user_id THEN 'withdrew'
      ELSE 'removed'
    END,
    CASE WHEN v_profile_exists THEN OLD.user_id END,
    OLD.guest_name,
    v_actor,
    public.is_beyond_game_capacity(OLD.game_id, OLD.signup_order)
  );
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_player_game_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_player_game_removal() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER log_player_game_signup
  AFTER INSERT ON player_games
  FOR EACH ROW EXECUTE FUNCTION public.log_player_game_signup();

CREATE TRIGGER log_player_game_removal
  AFTER DELETE ON player_games
  FOR EACH ROW EXECUTE FUNCTION public.log_player_game_removal();

-- Backfill: every current signup's join is known from player_games itself.
-- Withdrawals that happened before this migration left no trace and can't
-- be recovered.
INSERT INTO game_signup_events (game_id, event_type, user_id, guest_name, actor_id, created_at)
SELECT
  game_id,
  CASE WHEN is_ringer THEN 'ringer_added' ELSE 'joined' END,
  user_id,
  guest_name,
  COALESCE(added_by, user_id),
  created_at
FROM player_games;
