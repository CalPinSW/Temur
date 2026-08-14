-- Ringers: guest (no-account) players a group member can add to a
-- group-scoped game once an admin opens it up.

-- ============================================
-- PLAYER_GAMES: allow guest ("ringer") rows
-- ============================================
ALTER TABLE player_games ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE player_games ADD COLUMN is_ringer BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE player_games ADD COLUMN guest_name TEXT;
ALTER TABLE player_games ADD COLUMN added_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- UNIQUE(game_id, user_id) is untouched: Postgres treats every NULL as
-- distinct for uniqueness purposes, so multiple ringer rows (user_id NULL)
-- per game are already permitted with no constraint change needed.
ALTER TABLE player_games ADD CONSTRAINT player_games_ringer_shape_check CHECK (
  (is_ringer AND user_id IS NULL AND guest_name IS NOT NULL AND added_by IS NOT NULL)
  OR
  (NOT is_ringer AND user_id IS NOT NULL AND guest_name IS NULL)
);

-- ============================================
-- GAMES: one-way "opened to ringers" marker
-- ============================================
ALTER TABLE games ADD COLUMN ringers_opened_at TIMESTAMPTZ;
ALTER TABLE games ADD COLUMN ringers_opened_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
-- No new games policy needed: "Game admins can update games" (is_game_admin
-- gated, from 20260812000000_add_groups_and_game_scoping.sql) already
-- allows admins to update any column on their game, including these two.

-- ============================================
-- AUTHORIZATION HELPER
-- Mirrors is_group_member/is_game_admin exactly (SECURITY DEFINER STABLE
-- plpgsql, no search_path override).
-- ============================================
CREATE OR REPLACE FUNCTION public.can_add_ringer(p_game_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_group_id UUID;
  v_ringers_opened_at TIMESTAMPTZ;
BEGIN
  SELECT group_id, ringers_opened_at INTO v_group_id, v_ringers_opened_at
  FROM games WHERE id = p_game_id;

  RETURN v_group_id IS NOT NULL
    AND v_ringers_opened_at IS NOT NULL
    AND is_group_member(v_group_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.can_add_ringer(UUID, UUID) TO authenticated;

-- ============================================
-- PLAYER_GAMES: new policies for ringer rows
-- Additive only. The existing self-signup INSERT policy ("Users can sign
-- up for games they can see", WITH CHECK auth.uid() = user_id) already
-- excludes ringer rows since user_id IS NULL never equals auth.uid(); the
-- same reasoning excludes ringer rows from the existing self-delete policy.
-- ============================================
CREATE POLICY "Group members can add ringers when open"
  ON player_games FOR INSERT
  TO authenticated
  WITH CHECK (
    is_ringer = true
    AND user_id IS NULL
    AND added_by = auth.uid()
    AND can_add_ringer(game_id, auth.uid())
  );

CREATE POLICY "Ringer adder or game admin can remove a ringer"
  ON player_games FOR DELETE
  TO authenticated
  USING (
    is_ringer = true
    AND (added_by = auth.uid() OR is_game_admin(game_id, auth.uid()))
  );

-- ============================================
-- SAVED_RINGERS: per-user remembered ringer names for quick re-add
-- ============================================
CREATE TABLE saved_ringers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_saved_ringers_user_id ON saved_ringers(user_id);

ALTER TABLE saved_ringers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved ringers"
  ON saved_ringers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved ringers"
  ON saved_ringers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved ringers"
  ON saved_ringers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved ringers"
  ON saved_ringers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Re-adding an existing name is an upsert (onConflict: user_id,name), which
-- bumps updated_at here — giving "most recently used first" ordering with
-- no extra column needed.
CREATE TRIGGER update_saved_ringers_updated_at
  BEFORE UPDATE ON saved_ringers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
