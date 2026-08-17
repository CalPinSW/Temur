import { getDefaultNotificationPreferences, mergeNotificationPreferences } from '../utils/notificationUtils';
import { NOTIFICATION_TYPES } from '../types/notification';

describe('getDefaultNotificationPreferences', () => {
  it('enables push and email for every notification type', () => {
    const defaults = getDefaultNotificationPreferences();

    expect(Object.keys(defaults).sort()).toEqual([...NOTIFICATION_TYPES].sort());
    for (const type of NOTIFICATION_TYPES) {
      expect(defaults[type]).toEqual({ push_enabled: true, email_enabled: true });
    }
  });

  it('returns independent objects across calls', () => {
    const first = getDefaultNotificationPreferences();
    first.friend_request.push_enabled = false;

    const second = getDefaultNotificationPreferences();

    expect(second.friend_request.push_enabled).toBe(true);
  });
});

describe('mergeNotificationPreferences', () => {
  it('falls back to defaults when there are no rows', () => {
    const merged = mergeNotificationPreferences([]);

    expect(merged).toEqual(getDefaultNotificationPreferences());
  });

  it('overrides only the types that have a stored row', () => {
    const merged = mergeNotificationPreferences([
      { notification_type: 'friend_request', push_enabled: false, email_enabled: true },
      { notification_type: 'game_visible', push_enabled: false, email_enabled: false },
    ]);

    expect(merged.friend_request).toEqual({ push_enabled: false, email_enabled: true });
    expect(merged.game_visible).toEqual({ push_enabled: false, email_enabled: false });
    expect(merged.group_invite).toEqual({ push_enabled: true, email_enabled: true });
  });
});
