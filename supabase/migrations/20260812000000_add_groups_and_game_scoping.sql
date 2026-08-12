-- Groups + per-game/per-group admin, drop global admin
-- 1) Drop the global admin flag and everything gated on it
-- 2) Add groups, group_members, group_invitations
-- 3) Scope games to a group (created by a group admin) or to a creator + invited
--    friends (a "friend game"), replacing the old "any global admin, any game"
--    model. Existing games (no group_id, no created_by) stay visible to everyone.

-- ============================================
-- DROP is_admin-GATED POLICIES, THEN THE COLUMN
-- ============================================
DROP POLICY IF EXISTS "Admins can create games" ON games;
DROP POLICY IF EXISTS "Admins can update games" ON games;
DROP POLICY IF EXISTS "Admins can delete games" ON games;
DROP POLICY IF EXISTS "Admins can update player game signups" ON player_games;

ALTER TABLE profiles DROP COLUMN is_admin;

-- ============================================
-- GROUPS
-- ============================================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- Directed, pending-only invite. Accepting inserts a group_members row and
-- deletes the invite; declining just deletes it. No history is kept.
CREATE TABLE group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, invited_user_id),
  CHECK (invited_by <> invited_user_id)
);

CREATE INDEX idx_group_invitations_invited_user_id ON group_invitations(invited_user_id);
CREATE INDEX idx_group_invitations_group_id ON group_invitations(group_id);

-- ============================================
-- GAME SCOPING
-- ============================================
ALTER TABLE games ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE games ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_games_group_id ON games(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_games_created_by ON games(created_by) WHERE created_by IS NOT NULL;

-- Directed invite for a "friend game" (a game with no group_id). Unlike group
-- invitations, acceptance is a meaningful, persisted state: accepting also
-- signs the player up (inserts player_games), so status stays around.
CREATE TABLE game_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, invited_user_id),
  CHECK (invited_by <> invited_user_id)
);

CREATE INDEX idx_game_invitations_invited_user_id ON game_invitations(invited_user_id);
CREATE INDEX idx_game_invitations_game_id ON game_invitations(game_id);

-- ============================================
-- AUTHORIZATION HELPER FUNCTIONS
-- SECURITY DEFINER so they can be used inside RLS policies (including on
-- group_members itself) without recursive-policy evaluation.
-- ============================================
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- A game's admin is either the creator (for a groupless "friend game") or
-- any admin of the game's group (for a group game).
CREATE OR REPLACE FUNCTION public.is_game_admin(p_game_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_group_id UUID;
  v_created_by UUID;
BEGIN
  SELECT group_id, created_by INTO v_group_id, v_created_by
  FROM games WHERE id = p_game_id;

  IF v_group_id IS NOT NULL THEN
    RETURN is_group_admin(v_group_id, p_user_id);
  END IF;

  RETURN v_created_by IS NOT NULL AND v_created_by = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- A game is visible to: its group's members, its creator, anyone it invited
-- (pending or accepted), or anyone at all if it's a legacy game (no group,
-- no creator).
CREATE OR REPLACE FUNCTION public.can_view_game(p_game_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_group_id UUID;
  v_created_by UUID;
BEGIN
  SELECT group_id, created_by INTO v_group_id, v_created_by
  FROM games WHERE id = p_game_id;

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

GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_game_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_game(UUID, UUID) TO authenticated;

-- ============================================
-- FUNCTION: Auto-add group creator as admin
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_group_created
  AFTER INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION handle_new_group();

-- ============================================
-- updated_at TRIGGERS
-- ============================================
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_invitations_updated_at
  BEFORE UPDATE ON game_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GROUPS POLICIES
-- ============================================
-- Includes the creator explicitly (not just is_group_member): the creator's
-- own membership row is added by the handle_new_group() trigger, which runs
-- after this INSERT completes, and Postgres checks this SELECT policy
-- against the row returned by `INSERT ... RETURNING` before that trigger's
-- effects are visible to it.
CREATE POLICY "Groups are viewable by members, creator, or invitees"
  ON groups FOR SELECT
  TO authenticated
  USING (
    is_group_member(id, auth.uid())
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_invitations
      WHERE group_id = groups.id AND invited_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (is_group_admin(id, auth.uid()))
  WITH CHECK (is_group_admin(id, auth.uid()));

CREATE POLICY "Group admins can delete groups"
  ON groups FOR DELETE
  TO authenticated
  USING (is_group_admin(id, auth.uid()));

-- ============================================
-- GROUP MEMBERS POLICIES
-- ============================================
CREATE POLICY "Group members are viewable by other members"
  ON group_members FOR SELECT
  TO authenticated
  USING (is_group_member(group_id, auth.uid()));

-- Self-join is only allowed when a pending invitation exists; this is how
-- "accept invite" works client-side (insert here, then delete the invite).
-- The group creator's own admin row is inserted by handle_new_group() above,
-- which runs as the table owner and so bypasses this policy.
CREATE POLICY "Invited users can join a group"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_invitations
      WHERE group_id = group_members.group_id AND invited_user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can update member roles"
  ON group_members FOR UPDATE
  TO authenticated
  USING (is_group_admin(group_id, auth.uid()))
  WITH CHECK (is_group_admin(group_id, auth.uid()));

CREATE POLICY "Members can leave or admins can remove members"
  ON group_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR is_group_admin(group_id, auth.uid()));

-- ============================================
-- GROUP INVITATIONS POLICIES
-- ============================================
CREATE POLICY "Group invitations are viewable by participants or admins"
  ON group_invitations FOR SELECT
  TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR invited_by = auth.uid()
    OR is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Group admins can invite players"
  ON group_invitations FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid() AND is_group_admin(group_id, auth.uid()));

CREATE POLICY "Participants or admins can delete group invitations"
  ON group_invitations FOR DELETE
  TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR invited_by = auth.uid()
    OR is_group_admin(group_id, auth.uid())
  );

-- ============================================
-- GAME INVITATIONS POLICIES
-- ============================================
CREATE POLICY "Game invitations are viewable by participants or admins"
  ON game_invitations FOR SELECT
  TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR invited_by = auth.uid()
    OR is_game_admin(game_id, auth.uid())
  );

CREATE POLICY "Game admins can invite players"
  ON game_invitations FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid() AND is_game_admin(game_id, auth.uid()));

CREATE POLICY "Invited users can accept their invitation"
  ON game_invitations FOR UPDATE
  TO authenticated
  USING (invited_user_id = auth.uid())
  WITH CHECK (invited_user_id = auth.uid());

CREATE POLICY "Participants or admins can delete game invitations"
  ON game_invitations FOR DELETE
  TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR invited_by = auth.uid()
    OR is_game_admin(game_id, auth.uid())
  );

-- ============================================
-- GAMES POLICIES (replace the old global-admin ones)
-- ============================================
DROP POLICY IF EXISTS "Games are viewable by authenticated users" ON games;

CREATE POLICY "Games are viewable by members, creator, or invitees"
  ON games FOR SELECT
  TO authenticated
  USING (can_view_game(id, auth.uid()));

-- Anyone can create a groupless "friend game" for themselves; only a group's
-- admins can create a game for that group.
CREATE POLICY "Users can create their own or their group's games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (group_id IS NULL OR is_group_admin(group_id, auth.uid()))
  );

CREATE POLICY "Game admins can update games"
  ON games FOR UPDATE
  TO authenticated
  USING (is_game_admin(id, auth.uid()))
  WITH CHECK (is_game_admin(id, auth.uid()));

CREATE POLICY "Game admins can delete games"
  ON games FOR DELETE
  TO authenticated
  USING (is_game_admin(id, auth.uid()));

-- ============================================
-- PLAYER GAMES POLICIES (scope to game visibility / per-game admin)
-- ============================================
DROP POLICY IF EXISTS "Player games are viewable by authenticated users" ON player_games;
DROP POLICY IF EXISTS "Users can sign up for games" ON player_games;

CREATE POLICY "Player games are viewable if the game is visible"
  ON player_games FOR SELECT
  TO authenticated
  USING (can_view_game(game_id, auth.uid()));

CREATE POLICY "Users can sign up for games they can see"
  ON player_games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND can_view_game(game_id, auth.uid()));

CREATE POLICY "Game admins can update player game signups"
  ON player_games FOR UPDATE
  TO authenticated
  USING (is_game_admin(game_id, auth.uid()))
  WITH CHECK (is_game_admin(game_id, auth.uid()));
