import { createNavigationContainerRef, ParamListBase } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<ParamListBase>();

export function navigate(name: string, params?: Record<string, unknown>) {
  if (navigationRef.isReady()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigationRef.navigate(name as any, params as any);
  }
}

export type NotificationScreen = 'FriendRequests' | 'Friends' | 'Home';

export function navigateFromNotification(screen: NotificationScreen) {
  if (!navigationRef.isReady()) return;

  switch (screen) {
    case 'FriendRequests':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigationRef.navigate('FriendsTab' as any, { screen: 'requests' });
      break;
    case 'Friends':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigationRef.navigate('FriendsTab' as any);
      break;
    case 'Home':
    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigationRef.navigate('HomeTab' as any);
      break;
  }
}
