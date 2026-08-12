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

  it('registers for push notifications and saves the token when one is returned', async () => {
    mockRegister.mockResolvedValue({ token: 'expo-token', platform: 'ios' });

    renderHook(() => useNotifications());

    await waitFor(() => expect(mockSaveToken).toHaveBeenCalledWith('expo-token'));
  });

  it('does not save a token when registration returns null', async () => {
    renderHook(() => useNotifications());

    await waitFor(() => expect(mockRegister).toHaveBeenCalled());

    expect(mockSaveToken).not.toHaveBeenCalled();
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
