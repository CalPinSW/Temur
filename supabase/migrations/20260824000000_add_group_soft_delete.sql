-- Soft-delete for groups: any group admin can delete a group while
-- preserving its row (and group_members, for posterity), mirroring
-- games' soft delete (20260820000000_add_game_soft_delete.sql). Deleting
-- a group also soft-deletes every game scoped to it.

ALTER TABLE groups ADD COLUMN deleted_at TIMESTAMPTZ;

-- Baking the deleted-group check into is_group_member/is_group_admin
-- (rather than only the groups table's own SELECT policy) means every
-- other policy already built on top of them — game creation, group
-- invitations, member management, game visibility via can_view_game's
-- is_group_member call — automatically stops treating a deleted group's
-- members as members, with no per-policy changes needed.
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id AND g.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id AND gm.role = 'admin'
      AND g.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- The creator/invitee branches below don't route through is_group_member,
-- so they need their own explicit deleted_at check.
DROP POLICY IF EXISTS "Groups are viewable by members, creator, or invitees" ON groups;

CREATE POLICY "Groups are viewable by members, creator, or invitees"
  ON groups FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_group_member(id, auth.uid())
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM group_invitations
        WHERE group_id = groups.id AND invited_user_id = auth.uid()
      )
    )
  );

-- Unlike delete_game (creator-only, deliberately narrower than
-- is_game_admin), this matches is_group_admin exactly — any group admin,
-- per the product ask. is_group_admin already excludes an already-deleted
-- group, so calling this twice raises the same "not authorized" error
-- rather than needing a separate idempotency check.
CREATE OR REPLACE FUNCTION public.delete_group(p_group_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_group_admin(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to delete this group';
  END IF;

  UPDATE games SET deleted_at = NOW(), updated_at = NOW()
  WHERE group_id = p_group_id AND deleted_at IS NULL;

  UPDATE groups SET deleted_at = NOW(), updated_at = NOW() WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_group(UUID) TO authenticated;
