-- Shareable game join links: a game admin generates a link that anyone can
-- use to gain access to that one game, as an alternative to directed
-- (search-by-friend) invitations via game_invitations. Mirrors
-- group_join_links (20260834000000/20260835000000) exactly, but grants game
-- access rather than group membership: using the link inserts a pending
-- game_invitations row for the visitor, same as if a friend had invited
-- them — it never adds them to the game's group. Links expire after 7 days.
--
-- No RLS policies are defined on this table — every access goes through the
-- SECURITY DEFINER RPCs below, which run as the table owner and so bypass
-- RLS entirely, the same pattern is_game_admin/can_view_game already use for
-- cross-table checks. RLS is still enabled so a bug in a future policy
-- addition fails closed rather than open.
CREATE TABLE game_join_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_game_join_links_game_id ON game_join_links(game_id);

ALTER TABLE game_join_links ENABLE ROW LEVEL SECURITY;

-- Returns the game's current unexpired join link, creating one (7-day
-- expiry) if none exists yet. Idempotent within that window so repeat
-- "copy join link" clicks share the same URL instead of invalidating it.
CREATE OR REPLACE FUNCTION public.get_or_create_game_join_link(p_game_id UUID)
RETURNS TABLE(token TEXT, expires_at TIMESTAMPTZ) AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF NOT is_game_admin(p_game_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to create a join link for this game';
  END IF;

  SELECT gjl.token, gjl.expires_at INTO v_token, v_expires_at
  FROM game_join_links gjl
  WHERE gjl.game_id = p_game_id AND gjl.expires_at > NOW()
  ORDER BY gjl.created_at DESC
  LIMIT 1;

  IF v_token IS NULL THEN
    v_token := gen_random_uuid()::TEXT;
    v_expires_at := NOW() + INTERVAL '7 days';
    INSERT INTO game_join_links (game_id, token, created_by, expires_at)
    VALUES (p_game_id, v_token, auth.uid(), v_expires_at);
  END IF;

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public preview so an unauthenticated visitor can see which game a join
-- link is for before being sent to sign up/log in. Returns no rows if the
-- token doesn't exist, is expired, or its game was soft-deleted.
CREATE OR REPLACE FUNCTION public.get_game_join_link_info(p_token TEXT)
RETURNS TABLE(game_id UUID, team1_name TEXT, team2_name TEXT, kickoff_date TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.team1_name, g.team2_name, g.kickoff_date
  FROM game_join_links gjl
  JOIN games g ON g.id = gjl.game_id
  WHERE gjl.token = p_token AND gjl.expires_at > NOW() AND g.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grants the calling user access to the link's game by inviting them to it,
-- exactly as a friend-invite would (see game_invitations and its
-- can_view_game fallback) — never adds them to the game's group. Idempotent:
-- a caller who already has access (existing member/creator/invitee) is
-- simply returned the game id, and ON CONFLICT DO NOTHING covers re-opening
-- the same link after already being invited.
CREATE OR REPLACE FUNCTION public.join_game_via_link(p_token TEXT)
RETURNS UUID AS $$
DECLARE
  v_game_id UUID;
  v_created_by UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to join a game';
  END IF;

  SELECT g.id, gjl.created_by INTO v_game_id, v_created_by
  FROM game_join_links gjl
  JOIN games g ON g.id = gjl.game_id
  WHERE gjl.token = p_token AND gjl.expires_at > NOW() AND g.deleted_at IS NULL;

  IF v_game_id IS NULL THEN
    RAISE EXCEPTION 'This join link is invalid or has expired';
  END IF;

  IF can_view_game(v_game_id, auth.uid()) THEN
    RETURN v_game_id;
  END IF;

  INSERT INTO game_invitations (game_id, invited_by, invited_user_id)
  VALUES (v_game_id, v_created_by, auth.uid())
  ON CONFLICT (game_id, invited_user_id) DO NOTHING;

  RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20260823000000's blanket `GRANT ALL ON ALL ROUTINES IN SCHEMA public TO
-- anon, authenticated, service_role` grants EXECUTE to anon, and CREATE
-- FUNCTION separately grants EXECUTE TO PUBLIC by default (which every role
-- inherits regardless of a REVOKE against that role specifically — see
-- 20260830000000_fix_internal_function_grants.sql and
-- 20260835000000_revoke_group_join_link_public_grant.sql, which caught the
-- same gap for group_join_links after the fact). Revoke both from the start
-- here for the two auth-required functions; get_game_join_link_info is
-- deliberately anon-callable (the pre-auth link preview).
REVOKE EXECUTE ON FUNCTION public.get_or_create_game_join_link(UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_game_via_link(TEXT) FROM anon, PUBLIC;
