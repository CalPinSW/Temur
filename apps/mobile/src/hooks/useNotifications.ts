import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from '@/services/notificationService';

interface UseNotificationsOptions {
  userId?: string;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Re-registers whenever the logged-in user changes (login, logout, or
  // switching accounts), rather than only once at mount — otherwise a user
  // who isn't already logged in when the app first launches never gets a
  // push token saved, since savePushToken silently no-ops without a session.
  useEffect(() => {
    if (!options.userId) return;

    registerForPushNotifications().then((pushToken) => {
      if (pushToken) {
        savePushToken(pushToken.token);
      }
    });
  }, [options.userId]);

  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener((notification) => {
      options.onNotificationReceived?.(notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = addNotificationResponseListener((response) => {
      options.onNotificationResponse?.(response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
