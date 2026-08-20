-- Shareable group join links: an admin generates a link that anyone can use
-- to join the group directly, as an alternative to directed (search-by-user)
-- invitations in group_invitations. Links expire after 7 days.
--
-- No RLS policies are defined on this table — every access goes through the
-- SECURITY DEFINER RPCs below, which run as the table owner and so bypass
-- RLS entirely, the same pattern is_group_admin/is_group_member already use
-- for cross-table checks. RLS is still enabled so a bug in a future policy
-- addition fails closed rather than open.
CREATE TABLE group_join_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_group_join_links_group_id ON group_join_links(group_id);

ALTER TABLE group_join_links ENABLE ROW LEVEL SECURITY;

-- Returns the group's current unexpired join link, creating one (7-day
-- expiry) if none exists yet. Idempotent within that window so repeat
-- "copy join link" clicks share the same URL instead of invalidating it.
CREATE OR REPLACE FUNCTION public.get_or_create_group_join_link(p_group_id UUID)
RETURNS TABLE(token TEXT, expires_at TIMESTAMPTZ) AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF NOT is_group_admin(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to create a join link for this group';
  END IF;

  SELECT gjl.token, gjl.expires_at INTO v_token, v_expires_at
  FROM group_join_links gjl
  WHERE gjl.group_id = p_group_id AND gjl.expires_at > NOW()
  ORDER BY gjl.created_at DESC
  LIMIT 1;

  IF v_token IS NULL THEN
    v_token := gen_random_uuid()::TEXT;
    v_expires_at := NOW() + INTERVAL '7 days';
    INSERT INTO group_join_links (group_id, token, created_by, expires_at)
    VALUES (p_group_id, v_token, auth.uid(), v_expires_at);
  END IF;

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public preview so an unauthenticated visitor can see which group a join
-- link is for before being sent to sign up/log in. Returns no rows if the
-- token doesn't exist, is expired, or its group was soft-deleted.
CREATE OR REPLACE FUNCTION public.get_group_join_link_info(p_token TEXT)
RETURNS TABLE(group_id UUID, group_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.name
  FROM group_join_links gjl
  JOIN groups g ON g.id = gjl.group_id
  WHERE gjl.token = p_token AND gjl.expires_at > NOW() AND g.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Joins the calling user to the link's group. Idempotent (ON CONFLICT DO
-- NOTHING) so re-opening the same link after already joining is a no-op
-- rather than an error.
CREATE OR REPLACE FUNCTION public.join_group_via_link(p_token TEXT)
RETURNS UUID AS $$
DECLARE
  v_group_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to join a group';
  END IF;

  SELECT g.id INTO v_group_id
  FROM group_join_links gjl
  JOIN groups g ON g.id = gjl.group_id
  WHERE gjl.token = p_token AND gjl.expires_at > NOW() AND g.deleted_at IS NULL;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'This join link is invalid or has expired';
  END IF;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, auth.uid(), 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20260823000000's blanket `GRANT ALL ON ALL ROUTINES IN SCHEMA public TO
-- anon, authenticated, service_role` already grants EXECUTE on all three of
-- these to anon; get_group_join_link_info is meant to be anon-callable (the
-- pre-auth link preview), but the other two both require auth.uid(), so
-- revoke anon explicitly rather than relying on their internal checks alone
-- — matching 20260830000000_fix_internal_function_grants.sql's convention.
REVOKE EXECUTE ON FUNCTION public.get_or_create_group_join_link(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_group_via_link(TEXT) FROM anon;
