import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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
 * Get user's notification preference
 */
export async function getNotificationsEnabled(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('notifications_enabled')
    .eq('id', userData.user.id)
    .single();

  return profile?.notifications_enabled ?? true;
}

/**
 * Toggle push notifications on/off
 * When disabled, removes push token from profile
 * When enabled, re-registers for push notifications
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  if (enabled) {
    // Re-register for push notifications and save token
    const pushToken = await registerForPushNotifications();
    if (pushToken) {
      await supabase
        .from('profiles')
        .update({ notifications_enabled: true, push_token: pushToken.token })
        .eq('id', userData.user.id);
    } else {
      // Just update the preference even if token registration fails
      await supabase
        .from('profiles')
        .update({ notifications_enabled: true })
        .eq('id', userData.user.id);
    }
  } else {
    // Disable notifications and clear badge
    await Notifications.setBadgeCountAsync(0);
    await supabase
      .from('profiles')
      .update({ notifications_enabled: false })
      .eq('id', userData.user.id);
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

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'game_invite'
  | 'game_visible'
  | 'team_assigned';

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
};
