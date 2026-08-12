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
  getNotificationsEnabled,
  setNotificationsEnabled,
  sendLocalNotification,
  NotificationTemplates,
} from '@/services/notificationService';

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

  describe('getNotificationsEnabled', () => {
    it('returns false when there is no logged-in user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getNotificationsEnabled();

      expect(result).toBe(false);
    });

    it("returns the user's stored preference", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: { notifications_enabled: false }, error: null });
      mockFromTables(mockSupabase, { profiles: builder });

      const result = await getNotificationsEnabled();

      expect(result).toBe(false);
    });

    it('defaults to true when no preference is stored', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { profiles: builder });

      const result = await getNotificationsEnabled();

      expect(result).toBe(true);
    });
  });

  describe('setNotificationsEnabled', () => {
    it('registers for push and saves the token when enabling', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { profiles: builder });
      mockNotifications.getPermissionsAsync.mockResolvedValue(permissionResponse('granted'));
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue(pushToken('new-token'));

      await setNotificationsEnabled(true);

      expect(builder.update).toHaveBeenCalledWith({
        notifications_enabled: true,
        push_token: 'new-token',
      });
    });

    it('still flips the preference on when push registration fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { profiles: builder });
      mockDevice.isDevice = false;

      await setNotificationsEnabled(true);

      expect(builder.update).toHaveBeenCalledWith({ notifications_enabled: true });
    });

    it('clears the badge and disables the preference when disabling', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { profiles: builder });

      await setNotificationsEnabled(false);

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
      expect(builder.update).toHaveBeenCalledWith({ notifications_enabled: false });
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
  });
});
