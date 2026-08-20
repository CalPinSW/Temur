import { createNavigationContainerRef, ParamListBase } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<ParamListBase>();

export function navigate(name: string, params?: Record<string, unknown>) {
  if (navigationRef.isReady()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigationRef.navigate(name as any, params as any);
  }
}

export function navigateToGame(gameId: string) {
  navigate('MainFunctionalityTab', { screen: 'detail', gameId });
}

export type NotificationScreen =
  'FriendRequests' | 'Friends' | 'Home' | 'GroupInvites' | 'GroupJoin' | 'GameDetail' | 'Games';

export function navigateFromNotification(
  screen: NotificationScreen,
  data?: Record<string, unknown>
) {
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
    case 'GroupInvites':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigationRef.navigate('GroupsTab' as any, { screen: 'invites' });
      break;
    case 'GroupJoin':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigationRef.navigate('GroupsTab' as any, { screen: 'join', token: data?.token });
      break;
    case 'GameDetail':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigationRef.navigate('MainFunctionalityTab' as any, {
        screen: 'detail',
        gameId: data?.gameId,
      });
      break;
    case 'Games':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigationRef.navigate('MainFunctionalityTab' as any);
      break;
    case 'Home':
    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigationRef.navigate('HomeTab' as any);
      break;
  }
}
