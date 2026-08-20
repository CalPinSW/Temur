jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

jest.mock('@/services/navigationService', () => ({
  navigateFromNotification: jest.fn(),
}));

import { Linking } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { supabase } from '@/services/supabase';
import { SupabaseMock } from './testUtils/supabaseMock';
import { useAuthStore } from '@/store/authStore';
import { navigateFromNotification } from '@/services/navigationService';
import { handleAuthDeepLink, handleDeepLink, useAuthDeepLinks } from '@/hooks/useAuthDeepLinks';

const mockSupabase = supabase as unknown as SupabaseMock;
const mockNavigateFromNotification = navigateFromNotification as jest.Mock;

describe('handleAuthDeepLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isPasswordRecovery: false });
  });

  it('establishes a session and flags recovery for a valid reset-password link', async () => {
    mockSupabase.auth.setSession.mockResolvedValue({ data: {}, error: null });

    await handleAuthDeepLink(
      'temur://reset-password#access_token=abc&refresh_token=def&type=recovery'
    );

    expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'abc',
      refresh_token: 'def',
    });
    expect(useAuthStore.getState().isPasswordRecovery).toBe(true);
  });

  it('ignores URLs that are not the reset-password link', async () => {
    await handleAuthDeepLink('temur://auth/callback#access_token=abc&refresh_token=def');

    expect(mockSupabase.auth.setSession).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isPasswordRecovery).toBe(false);
  });

  it('does not establish a session when the link carries an error', async () => {
    await handleAuthDeepLink(
      'temur://reset-password#error=access_denied&error_description=expired'
    );

    expect(mockSupabase.auth.setSession).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isPasswordRecovery).toBe(false);
  });

  it('does not flag recovery when there is no access token', async () => {
    await handleAuthDeepLink('temur://reset-password');

    expect(mockSupabase.auth.setSession).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isPasswordRecovery).toBe(false);
  });

  it('does not flag recovery when setSession fails', async () => {
    mockSupabase.auth.setSession.mockResolvedValue({
      data: null,
      error: new Error('expired token'),
    });

    await handleAuthDeepLink('temur://reset-password#access_token=abc&refresh_token=def');

    expect(useAuthStore.getState().isPasswordRecovery).toBe(false);
  });
});

describe('handleDeepLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isPasswordRecovery: false });
  });

  it('routes a reset-password link through the auth flow instead of navigation', async () => {
    mockSupabase.auth.setSession.mockResolvedValue({ data: {}, error: null });

    handleDeepLink('temur://reset-password#access_token=abc&refresh_token=def');
    await Promise.resolve();

    expect(mockSupabase.auth.setSession).toHaveBeenCalled();
    expect(mockNavigateFromNotification).not.toHaveBeenCalled();
  });

  it('navigates to the matching screen for a non-auth universal link', () => {
    handleDeepLink('https://www.temur.app/games/abc-123');

    expect(mockNavigateFromNotification).toHaveBeenCalledWith('GameDetail', {
      gameId: 'abc-123',
    });
    expect(mockSupabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('does nothing for a link with no matching screen', () => {
    handleDeepLink('https://www.temur.app/profile/edit');

    expect(mockNavigateFromNotification).not.toHaveBeenCalled();
  });
});

describe('useAuthDeepLinks', () => {
  it('checks the initial URL and subscribes to future url events on mount, unsubscribing on unmount', () => {
    const getInitialURLSpy = jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    const remove = jest.fn();
    const addEventListenerSpy = jest
      .spyOn(Linking, 'addEventListener')
      .mockReturnValue({ remove } as unknown as ReturnType<typeof Linking.addEventListener>);

    const { unmount } = renderHook(() => useAuthDeepLinks());

    expect(getInitialURLSpy).toHaveBeenCalled();
    expect(addEventListenerSpy).toHaveBeenCalledWith('url', expect.any(Function));

    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
