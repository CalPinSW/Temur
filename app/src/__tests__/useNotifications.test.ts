import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/notificationService', () => ({
  __esModule: true,
  registerForPushNotifications: jest.fn(),
  savePushToken: jest.fn(),
  addNotificationResponseListener: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
}));

import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from '@/services/notificationService';
import { useNotifications } from '@/hooks/useNotifications';

const mockRegister = registerForPushNotifications as jest.Mock;
const mockSaveToken = savePushToken as jest.Mock;
const mockAddResponseListener = addNotificationResponseListener as jest.Mock;
const mockAddReceivedListener = addNotificationReceivedListener as jest.Mock;

describe('useNotifications', () => {
  const removeResponse = jest.fn();
  const removeReceived = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRegister.mockResolvedValue(null);
    mockAddResponseListener.mockReturnValue({ remove: removeResponse });
    mockAddReceivedListener.mockReturnValue({ remove: removeReceived });
  });

  it('registers for push notifications and saves the token when a user is logged in', async () => {
    mockRegister.mockResolvedValue({ token: 'expo-token', platform: 'ios' });

    renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => expect(mockSaveToken).toHaveBeenCalledWith('expo-token'));
  });

  it('does not save a token when registration returns null', async () => {
    renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => expect(mockRegister).toHaveBeenCalled());

    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it('does not register when there is no logged-in user', () => {
    renderHook(() => useNotifications());

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('re-registers when the logged-in user changes', async () => {
    mockRegister.mockResolvedValue({ token: 'expo-token', platform: 'ios' });

    const { rerender } = renderHook(
      ({ userId }: { userId: string | undefined }) => useNotifications({ userId }),
      { initialProps: { userId: undefined } }
    );

    expect(mockRegister).not.toHaveBeenCalled();

    rerender({ userId: 'user-1' });
    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));

    rerender({ userId: 'user-2' });
    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(2));
  });

  it('forwards received notifications to the onNotificationReceived callback', () => {
    const onNotificationReceived = jest.fn();
    renderHook(() => useNotifications({ onNotificationReceived }));

    const receivedCallback = mockAddReceivedListener.mock.calls[0][0];
    const notification = { request: { content: { title: 'hi' } } };
    receivedCallback(notification);

    expect(onNotificationReceived).toHaveBeenCalledWith(notification);
  });

  it('forwards notification responses to the onNotificationResponse callback', () => {
    const onNotificationResponse = jest.fn();
    renderHook(() => useNotifications({ onNotificationResponse }));

    const responseCallback = mockAddResponseListener.mock.calls[0][0];
    const response = { notification: { request: { content: { data: { screen: 'Home' } } } } };
    responseCallback(response);

    expect(onNotificationResponse).toHaveBeenCalledWith(response);
  });

  it('removes both listeners on unmount', () => {
    const { unmount } = renderHook(() => useNotifications());

    unmount();

    expect(removeResponse).toHaveBeenCalled();
    expect(removeReceived).toHaveBeenCalled();
  });
});
