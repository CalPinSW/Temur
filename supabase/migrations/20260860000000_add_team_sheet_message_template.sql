-- A group's "team sheet" message: a text template an admin copies to the
-- clipboard from a game's detail page once teams are assigned, for pasting
-- into the group's own chat (e.g. WhatsApp). Separate from
-- team_assignment_message_template, which pre-fills the push/email notify
-- message. NULL means "use the app's built-in default template".
--
-- Placeholders ({team1}, {team1_players}, {kickoff_time-5}, ...) are
-- substituted client-side by buildTeamSheetMessage in packages/shared.
--
-- No new RLS policy needed: the existing "Group admins can update groups"
-- policy already covers every column on groups.

ALTER TABLE groups ADD COLUMN team_sheet_message_template TEXT
  CHECK (char_length(team_sheet_message_template) <= 2000);
