jest.mock('@react-navigation/native', () => {
  const navigate = jest.fn();
  const state = { isReady: true };
  return {
    __esModule: true,
    createNavigationContainerRef: () => ({
      isReady: () => state.isReady,
      navigate,
    }),
    __mockNavigate: navigate,
    __setIsReady: (value: boolean) => {
      state.isReady = value;
    },
  };
});

import * as ReactNavigationNative from '@react-navigation/native';
import { navigate, navigateFromNotification, navigateToGame } from '@/services/navigationService';

const mockedModule = ReactNavigationNative as unknown as {
  __mockNavigate: jest.Mock;
  __setIsReady: (value: boolean) => void;
};
const mockNavigate = mockedModule.__mockNavigate;
const setIsReady = mockedModule.__setIsReady;

describe('navigationService', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setIsReady(true);
  });

  describe('navigate', () => {
    it('navigates when the navigator is ready', () => {
      navigate('SomeScreen', { id: '1' });

      expect(mockNavigate).toHaveBeenCalledWith('SomeScreen', { id: '1' });
    });

    it('does nothing when the navigator is not ready', () => {
      setIsReady(false);

      navigate('SomeScreen');

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('navigateToGame', () => {
    it('navigates to the game detail screen on the games tab', () => {
      navigateToGame('game-1');

      expect(mockNavigate).toHaveBeenCalledWith('MainFunctionalityTab', {
        screen: 'detail',
        gameId: 'game-1',
      });
    });

    it('does nothing when the navigator is not ready', () => {
      setIsReady(false);

      navigateToGame('game-1');

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('navigateFromNotification', () => {
    it('navigates to the friend requests tab for FriendRequests', () => {
      navigateFromNotification('FriendRequests');

      expect(mockNavigate).toHaveBeenCalledWith('FriendsTab', { screen: 'requests' });
    });

    it('navigates to the friends tab for Friends', () => {
      navigateFromNotification('Friends');

      expect(mockNavigate).toHaveBeenCalledWith('FriendsTab');
    });

    it('navigates to the home tab for Home', () => {
      navigateFromNotification('Home');

      expect(mockNavigate).toHaveBeenCalledWith('HomeTab');
    });

    it('navigates to the groups tab join screen with the token for GroupJoin', () => {
      navigateFromNotification('GroupJoin', { token: 'tok123' });

      expect(mockNavigate).toHaveBeenCalledWith('GroupsTab', { screen: 'join', token: 'tok123' });
    });

    it('does nothing when the navigator is not ready', () => {
      setIsReady(false);

      navigateFromNotification('Home');

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
