-- Soft-delete for games: the creator can delete a game while preserving its
-- row (and everything referencing it — player_games, ratings, results) for
-- posterity, rather than a hard DELETE (the existing "Game admins can
-- delete games" DELETE policy already covers a hard delete, but nothing
-- in either app calls it).

ALTER TABLE games ADD COLUMN deleted_at TIMESTAMPTZ;

-- Soft-deleted games disappear from every existing read (can_view_game
-- backs the games table's one SELECT policy, so this single change covers
-- every query in both apps without needing per-query filters) — for
-- everyone, including the creator; there's no "recover a deleted game" UI.
CREATE OR REPLACE FUNCTION public.can_view_game(p_game_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
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
    RETURN is_group_member(v_group_id, p_user_id);
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Deliberately narrower than the existing "Game admins can delete games"
-- policy (is_game_admin — creator for a friend game, but *any* group admin
-- for a group game): this is creator-only, matching the product ask
-- exactly. A SECURITY DEFINER function rather than a DELETE/UPDATE policy
-- change, for the same reason set_game_result is one — bespoke
-- authorization that shouldn't loosen the general UPDATE policy.
CREATE OR REPLACE FUNCTION public.delete_game(p_game_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM games
    WHERE id = p_game_id AND created_by = auth.uid() AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this game';
  END IF;

  UPDATE games SET deleted_at = NOW(), updated_at = NOW() WHERE id = p_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_game(UUID) TO authenticated;
