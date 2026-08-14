-- Group/game admins need to delete a removed member's player_games rows
-- (see groupService.removeMember) but the only existing DELETE policy on
-- player_games is "owner can delete their own row". Add an admin-scoped
-- DELETE policy mirroring the existing admin UPDATE policy.
CREATE POLICY "Game admins can remove player game signups"
  ON player_games FOR DELETE
  TO authenticated
  USING (is_game_admin(game_id, auth.uid()));
