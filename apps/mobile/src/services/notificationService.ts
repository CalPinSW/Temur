import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  NOTIFICATION_TYPES,
  getDefaultNotificationPreferences,
  mergeNotificationPreferences,
  type NotificationType,
  type NotificationChannel,
  type NotificationPreferences,
} from '@temur/shared';
import { supabase } from './supabase';

export type { NotificationType };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<PushToken | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  return {
    token: tokenData.data,
    platform,
  };
}

/**
 * Save push token to user's profile
 */
export async function savePushToken(token: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase.from('profiles').update({ push_token: token }).eq('id', userData.user.id);
}

/**
 * Remove push token from user's profile (on logout)
 */
export async function removePushToken(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase.from('profiles').update({ push_token: null }).eq('id', userData.user.id);
}

/**
 * Get the signed-in user's per-type push/email notification preferences,
 * merged with defaults (both channels enabled) for any type they haven't
 * overridden.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return getDefaultNotificationPreferences();

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('notification_type, push_enabled, email_enabled')
    .eq('user_id', userData.user.id);

  if (error || !data) return getDefaultNotificationPreferences();
  return mergeNotificationPreferences(data);
}

/**
 * Set a single channel's preference for one notification type. `current` is
 * the type's full current state (as returned by getNotificationPreferences)
 * so the upsert always writes both columns rather than relying on Supabase's
 * upsert-conflict column semantics for the untouched channel.
 */
export async function setNotificationPreference(
  type: NotificationType,
  current: NotificationPreferences[NotificationType],
  channel: NotificationChannel,
  enabled: boolean
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase.from('notification_preferences').upsert(
    {
      user_id: userData.user.id,
      notification_type: type,
      push_enabled: channel === 'push_enabled' ? enabled : current.push_enabled,
      email_enabled: channel === 'email_enabled' ? enabled : current.email_enabled,
    },
    { onConflict: 'user_id,notification_type' }
  );

  if (channel === 'push_enabled' && !enabled) {
    await Notifications.setBadgeCountAsync(0);
  }
}

/**
 * Set one channel's preference for every notification type at once (the
 * "select all" action).
 */
export async function setAllNotificationPreferences(
  current: NotificationPreferences,
  channel: NotificationChannel,
  enabled: boolean
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const userId = userData.user.id;

  await supabase.from('notification_preferences').upsert(
    NOTIFICATION_TYPES.map((type) => ({
      user_id: userId,
      notification_type: type,
      push_enabled: channel === 'push_enabled' ? enabled : current[type].push_enabled,
      email_enabled: channel === 'email_enabled' ? enabled : current[type].email_enabled,
    })),
    { onConflict: 'user_id,notification_type' }
  );

  if (channel === 'push_enabled' && !enabled) {
    await Notifications.setBadgeCountAsync(0);
  }
}

/**
 * Send a local notification (for testing)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // immediate
  });
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Create notification payloads for different events
 */
export const NotificationTemplates = {
  friendRequest: (fromUsername: string): NotificationPayload => ({
    type: 'friend_request',
    title: 'New Friend Request',
    body: `${fromUsername} wants to be your friend`,
    data: { screen: 'FriendRequests' },
  }),

  friendAccepted: (username: string): NotificationPayload => ({
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    body: `${username} accepted your friend request`,
    data: { screen: 'Friends' },
  }),

  groupInvite: (groupName: string, fromUsername: string): NotificationPayload => ({
    type: 'group_invite',
    title: 'New Group Invite',
    body: `${fromUsername} invited you to join ${groupName}`,
    data: { screen: 'GroupInvites' },
  }),

  gameInvite: (fromUsername: string, gameId: string): NotificationPayload => ({
    type: 'game_invite',
    title: 'New Game Invite',
    body: `${fromUsername} invited you to a game`,
    data: { screen: 'GameDetail', gameId },
  }),

  // Not called by client code — the pg_cron sweep (supabase/functions/
  // sweep-visible-games) constructs this same copy independently in Deno,
  // since it can't import this React Native module. Keep the two in sync
  // by hand if this copy changes.
  gameVisible: (groupName: string, gameId: string): NotificationPayload => ({
    type: 'game_visible',
    title: 'New Game Available',
    body: `A new game is open for sign-ups in ${groupName}`,
    data: { screen: 'GameDetail', gameId },
  }),

  teamAssigned: (teamName: string, gameId: string, adminMessage?: string): NotificationPayload => {
    const suffix = `You're on ${teamName}`;
    return {
      type: 'team_assigned',
      title: 'Team Assignment',
      body: adminMessage ? `${adminMessage}\n\n${suffix}` : suffix,
      data: { screen: 'GameDetail', gameId },
    };
  },

  ringersOpen: (gameId: string, adminMessage?: string): NotificationPayload => ({
    type: 'ringers_open',
    title: 'Ringers needed!',
    body: adminMessage?.trim()
      ? adminMessage.trim()
      : 'This game is now open to ringers — add one if you know someone who can play.',
    data: { screen: 'GameDetail', gameId },
  }),
};
