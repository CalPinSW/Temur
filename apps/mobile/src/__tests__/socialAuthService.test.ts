jest.mock('expo-web-browser', () => ({
  __esModule: true,
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: jest.fn(() => 'temur://auth/callback'),
}));

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/supabase';
import { SupabaseMock } from './testUtils/supabaseMock';
import { signInWithGoogle, signInWithApple } from '@/services/socialAuthService';

const mockSupabase = supabase as unknown as SupabaseMock;
const mockWebBrowser = WebBrowser as jest.Mocked<typeof WebBrowser>;

describe('socialAuthService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('exchanges the callback URL access token for a session', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider.example/authorize' },
      error: null,
    });
    mockWebBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'temur://auth/callback#access_token=abc123&refresh_token=refresh456',
    } as WebBrowser.WebBrowserAuthSessionResult);
    mockSupabase.auth.setSession.mockResolvedValue({
      data: { session: { access_token: 'abc123' } },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'temur://auth/callback', skipBrowserRedirect: true },
    });
    expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'abc123',
      refresh_token: 'refresh456',
    });
    expect(result).toEqual({ data: { session: { access_token: 'abc123' } }, error: null });
  });

  it('returns an error when the user cancels the auth session', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider.example/authorize' },
      error: null,
    });
    mockWebBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'cancel',
    } as WebBrowser.WebBrowserAuthSessionResult);

    const result = await signInWithApple();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(mockSupabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('returns an error when supabase does not return an OAuth URL', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(mockWebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  });

  it('returns an error when supabase OAuth setup fails', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: new Error('provider unavailable'),
    });

    const result = await signInWithGoogle();

    expect(result.data).toBeNull();
    expect(result.error).toEqual(new Error('provider unavailable'));
  });

  it('surfaces the error param from the callback URL when there is no access token', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider.example/authorize' },
      error: null,
    });
    mockWebBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'temur://auth/callback?error=access_denied&error_description=User+denied+access',
    } as WebBrowser.WebBrowserAuthSessionResult);

    const result = await signInWithGoogle();

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('User denied access');
  });
});
