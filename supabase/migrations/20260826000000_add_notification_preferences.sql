-- Per-type, per-channel notification preferences, replacing the single
-- global profiles.notifications_enabled switch. Rows are sparse overrides:
-- a user with no row for a given notification_type gets both channels
-- enabled by default (see mergeNotificationPreferences in packages/shared),
-- so existing users keep receiving everything they already did until they
-- opt out of something specific, and signup doesn't need to backfill one
-- row per type.
CREATE TABLE notification_preferences (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'friend_request', 'friend_accepted', 'group_invite', 'game_invite',
    'team_assigned', 'ringers_open', 'game_visible'
  )),
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Superseded by the per-type/per-channel table above.
DROP INDEX IF EXISTS idx_profiles_notifications_enabled;
ALTER TABLE profiles DROP COLUMN notifications_enabled;
