-- can_view_game previously returned as soon as it found a group_id, never
-- falling through to check game_invitations — so there was no way to give
-- a non-group-member access to a single group-scoped game. Extend the
-- group_id branch to also accept an explicit invitation, same as the
-- groupless branch below it already does. game_invitations' own INSERT
-- policy (is_game_admin(game_id, auth.uid())) already covers group admins
-- inviting to a group game with no changes needed, and player_games' self
-- signup INSERT policy already delegates to can_view_game, so an invited
-- non-member signing up for just this game falls out for free. Invited
-- users gain no group membership or visibility into the group's other
-- games — is_group_member is untouched.
--
-- Deliberately not adding `SET search_path` here (unlike newer functions
-- in this codebase): is_group_member has no search_path of its own and
-- uses unqualified table references, so it inherits whatever search_path
-- is active in the calling function — setting it here broke
-- is_group_member with "relation group_members does not exist". Fixing
-- that properly means auditing search_path across every SECURITY DEFINER
-- function together, not as a side effect of this migration.
CREATE OR REPLACE FUNCTION public.can_view_game(p_game_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $function$
DECLARE
  v_group_id UUID;
  v_created_by UUID;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  SELECT group_id, created_by, deleted_at INTO v_group_id, v_created_by, v_deleted_at
  FROM games WHERE id = p_game_id;

  IF v_deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  IF v_group_id IS NOT NULL THEN
    IF is_group_member(v_group_id, p_user_id) THEN
      RETURN TRUE;
    END IF;

    RETURN EXISTS (
      SELECT 1 FROM game_invitations
      WHERE game_id = p_game_id AND invited_user_id = p_user_id
    );
  END IF;

  IF v_created_by IS NULL THEN
    RETURN TRUE;
  END IF;

  IF v_created_by = p_user_id THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM game_invitations
    WHERE game_id = p_game_id AND invited_user_id = p_user_id
  );
END;
$function$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
