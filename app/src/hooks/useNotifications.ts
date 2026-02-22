import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from '@/services/notificationService';

interface UseNotificationsOptions {
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().then((pushToken) => {
      if (pushToken) {
        savePushToken(pushToken.token);
      }
    });

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
