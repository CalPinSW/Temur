import {
  NOTIFICATION_TYPES,
  type NotificationPreferenceRow,
  type NotificationPreferences,
} from '../types/notification';

const DEFAULT_CHANNEL_PREFERENCES = { push_enabled: true, email_enabled: true } as const;

export const getDefaultNotificationPreferences = (): NotificationPreferences =>
  Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [type, { ...DEFAULT_CHANNEL_PREFERENCES }])
  ) as NotificationPreferences;

// Rows are sparse overrides (see the notification_preferences migration) —
// a type with no row falls back to both channels enabled.
export const mergeNotificationPreferences = (
  rows: NotificationPreferenceRow[]
): NotificationPreferences => {
  const merged = getDefaultNotificationPreferences();
  for (const row of rows) {
    merged[row.notification_type] = {
      push_enabled: row.push_enabled,
      email_enabled: row.email_enabled,
    };
  }
  return merged;
};
