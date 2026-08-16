-- Supports self-service account deletion (delete-account edge function,
-- which calls supabase.auth.admin.deleteUser() and lets the FK graph off
-- profiles.id ON DELETE CASCADE do the rest).

-- Pre-existing bug, independent of the new feature: groups.created_by was
-- ON DELETE CASCADE, unlike games.created_by (ON DELETE SET NULL, added in
-- the same original migration). Deleting a group's creator — via this new
-- feature, or even a manual dashboard deletion today — would hard-delete
-- the entire group for every other member, plus every game scoped to it,
-- which contradicts the group-admin model (any admin controls the group,
-- not just its creator) already established by group soft-delete
-- (20260824000000_add_group_soft_delete.sql). Matches games.created_by now.
ALTER TABLE groups DROP CONSTRAINT groups_created_by_fkey;
ALTER TABLE groups ADD CONSTRAINT groups_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
