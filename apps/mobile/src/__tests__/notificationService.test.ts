jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));

jest.mock('expo-notifications', () => ({
  __esModule: true,
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import {
  registerForPushNotifications,
  savePushToken,
  removePushToken,
  getNotificationPreferences,
  setNotificationPreference,
  setAllNotificationPreferences,
  sendLocalNotification,
  NotificationTemplates,
} from '@/services/notificationService';
import { getDefaultNotificationPreferences } from '@temur/shared';

const mockSupabase = supabase as unknown as SupabaseMock;
const mockDevice = Device as unknown as { isDevice: boolean };
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

function permissionResponse(
  status: 'granted' | 'denied' | 'undetermined'
): Notifications.PermissionResponse {
  return { status } as unknown as Notifications.PermissionResponse;
}

function pushToken(data: string): Notifications.ExpoPushToken {
  return { type: 'expo', data } as unknown as Notifications.ExpoPushToken;
}

describe('notificationService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockDevice.isDevice = true;
  });

  describe('registerForPushNotifications', () => {
    it('returns null on a simulator/emulator', async () => {
      mockDevice.isDevice = false;

      const result = await registerForPushNotifications();

      expect(result).toBeNull();
      expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permission when not already granted, and returns the token', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue(permissionResponse('undetermined'));
      mockNotifications.requestPermissionsAsync.mockResolvedValue(permissionResponse('granted'));
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue(
        pushToken('ExponentPushToken[abc]')
      );

      const result = await registerForPushNotifications();

      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(result).toEqual({ token: 'ExponentPushToken[abc]', platform: 'ios' });
    });

    it('does not re-request permission when already granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue(permissionResponse('granted'));
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue(pushToken('token-1'));

      await registerForPushNotifications();

      expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('returns null when permission is denied', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue(permissionResponse('denied'));
      mockNotifications.requestPermissionsAsync.mockResolvedValue(permissionResponse('denied'));

      const result = await registerForPushNotifications();

      expect(result).toBeNull();
      expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
  });

  describe('savePushToken', () => {
    it('updates the profile with the push token for the logged-in user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { profiles: builder });

      await savePushToken('token-123');

      expect(builder.update).toHaveBeenCalledWith({ push_token: 'token-123' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
    });

    it('does nothing when there is no logged-in user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await savePushToken('token-123');

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('removePushToken', () => {
    it('clears the push token for the logged-in user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { profiles: builder });

      await removePushToken();

      expect(builder.update).toHaveBeenCalledWith({ push_token: null });
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  describe('getNotificationPreferences', () => {
    it('returns defaults when there is no logged-in user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getNotificationPreferences();

      expect(result).toEqual(getDefaultNotificationPreferences());
    });

    it('merges stored rows onto the defaults', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({
        data: [{ notification_type: 'friend_request', push_enabled: false, email_enabled: true }],
        error: null,
      });
      mockFromTables(mockSupabase, { notification_preferences: builder });

      const result = await getNotificationPreferences();

      expect(result.friend_request).toEqual({ push_enabled: false, email_enabled: true });
      expect(result.group_invite).toEqual({ push_enabled: true, email_enabled: true });
    });

    it('returns defaults when the query errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: { message: 'boom' } });
      mockFromTables(mockSupabase, { notification_preferences: builder });

      const result = await getNotificationPreferences();

      expect(result).toEqual(getDefaultNotificationPreferences());
    });
  });

  describe('setNotificationPreference', () => {
    it('upserts both channels, flipping only the changed one', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { notification_preferences: builder });

      await setNotificationPreference(
        'friend_request',
        { push_enabled: true, email_enabled: true },
        'push_enabled',
        false
      );

      expect(builder.upsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          notification_type: 'friend_request',
          push_enabled: false,
          email_enabled: true,
        },
        { onConflict: 'user_id,notification_type' }
      );
    });

    it('clears the badge when disabling push', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { notification_preferences: builder });

      await setNotificationPreference(
        'friend_request',
        { push_enabled: true, email_enabled: true },
        'push_enabled',
        false
      );

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });

    it('does not touch the badge when disabling email', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { notification_preferences: builder });

      await setNotificationPreference(
        'friend_request',
        { push_enabled: true, email_enabled: true },
        'email_enabled',
        false
      );

      expect(mockNotifications.setBadgeCountAsync).not.toHaveBeenCalled();
    });
  });

  describe('setAllNotificationPreferences', () => {
    it('upserts every notification type with the new channel value', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { notification_preferences: builder });

      await setAllNotificationPreferences(
        getDefaultNotificationPreferences(),
        'email_enabled',
        false
      );

      const rows = builder.upsert.mock.calls[0][0] as {
        notification_type: string;
        push_enabled: boolean;
        email_enabled: boolean;
      }[];
      expect(rows).toHaveLength(7);
      expect(rows.every((row) => row.email_enabled === false && row.push_enabled === true)).toBe(
        true
      );
    });
  });

  describe('sendLocalNotification', () => {
    it('schedules an immediate local notification', async () => {
      await sendLocalNotification('Title', 'Body', { screen: 'Home' });

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: { title: 'Title', body: 'Body', data: { screen: 'Home' } },
        trigger: null,
      });
    });
  });

  describe('NotificationTemplates', () => {
    it('builds a friend request payload', () => {
      expect(NotificationTemplates.friendRequest('alice')).toEqual({
        type: 'friend_request',
        title: 'New Friend Request',
        body: 'alice wants to be your friend',
        data: { screen: 'FriendRequests' },
      });
    });

    it('builds a friend accepted payload', () => {
      expect(NotificationTemplates.friendAccepted('bob')).toEqual({
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        body: 'bob accepted your friend request',
        data: { screen: 'Friends' },
      });
    });

    it('builds a game visible payload', () => {
      expect(NotificationTemplates.gameVisible('Tuesday Football', 'game-1')).toEqual({
        type: 'game_visible',
        title: 'New Game Available',
        body: 'A new game is open for sign-ups in Tuesday Football',
        data: { screen: 'GameDetail', gameId: 'game-1' },
      });
    });

    it('builds a team assigned payload with an admin message', () => {
      expect(NotificationTemplates.teamAssigned('Team A', 'game-1', 'Good luck!')).toEqual({
        type: 'team_assigned',
        title: 'Team Assignment',
        body: "Good luck!\n\nYou're on Team A",
        data: { screen: 'GameDetail', gameId: 'game-1' },
      });
    });

    it('builds a team assigned payload without an admin message', () => {
      expect(NotificationTemplates.teamAssigned('Team A', 'game-1')).toEqual({
        type: 'team_assigned',
        title: 'Team Assignment',
        body: "You're on Team A",
        data: { screen: 'GameDetail', gameId: 'game-1' },
      });
    });

    it('builds a ringers open payload with a custom admin message', () => {
      expect(NotificationTemplates.ringersOpen('game-1', 'Need 2 more players!')).toEqual({
        type: 'ringers_open',
        title: 'Ringers needed!',
        body: 'Need 2 more players!',
        data: { screen: 'GameDetail', gameId: 'game-1' },
      });
    });

    it('builds a ringers open payload with a default message when none is given', () => {
      expect(NotificationTemplates.ringersOpen('game-1')).toEqual({
        type: 'ringers_open',
        title: 'Ringers needed!',
        body: 'This game is now open to ringers — add one if you know someone who can play.',
        data: { screen: 'GameDetail', gameId: 'game-1' },
      });
    });

    it('builds a ringers open payload with the default message when given blank whitespace', () => {
      expect(NotificationTemplates.ringersOpen('game-1', '   ')).toEqual({
        type: 'ringers_open',
        title: 'Ringers needed!',
        body: 'This game is now open to ringers — add one if you know someone who can play.',
        data: { screen: 'GameDetail', gameId: 'game-1' },
      });
    });
  });
});
