jest.mock('@react-native-google-signin/google-signin', () => ({
  __esModule: true,
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
    NULL_PRESENTER: 'NULL_PRESENTER',
  },
}));

jest.mock('expo-apple-authentication', () => ({
  __esModule: true,
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/services/supabase';
import { SupabaseMock } from './testUtils/supabaseMock';
import {
  signInWithGoogle,
  signInWithApple,
  signInWithProvider,
  ExpectedSocialAuthError,
} from '@/services/socialAuthService';

const mockSupabase = supabase as unknown as SupabaseMock;
const mockGoogleSignin = GoogleSignin as jest.Mocked<typeof GoogleSignin>;
const mockAppleAuthentication = AppleAuthentication as jest.Mocked<typeof AppleAuthentication>;
const mockCaptureException = Sentry.captureException as jest.Mock;

describe('socialAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('exchanges the Google ID token for a Supabase session', async () => {
      mockGoogleSignin.signIn.mockResolvedValue({
        data: { idToken: 'google-id-token' },
      } as Awaited<ReturnType<typeof GoogleSignin.signIn>>);
      mockSupabase.auth.signInWithIdToken.mockResolvedValue({
        data: { session: { access_token: 'abc123' } },
        error: null,
      });

      const result = await signInWithGoogle();

      expect(mockGoogleSignin.hasPlayServices).toHaveBeenCalled();
      expect(mockSupabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'google',
        token: 'google-id-token',
      });
      expect(result).toEqual({ data: { session: { access_token: 'abc123' } }, error: null });
    });

    it('returns an error when no idToken is returned', async () => {
      mockGoogleSignin.signIn.mockResolvedValue({
        data: {},
      } as Awaited<ReturnType<typeof GoogleSignin.signIn>>);

      const result = await signInWithGoogle();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(mockSupabase.auth.signInWithIdToken).not.toHaveBeenCalled();
    });

    it('returns a cancellation error when the user cancels, without reporting to Sentry', async () => {
      mockGoogleSignin.signIn.mockRejectedValue({ code: statusCodes.SIGN_IN_CANCELLED });

      const result = await signInWithGoogle();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(ExpectedSocialAuthError);
      expect(result.error?.message).toBe('Authentication was cancelled');
      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it('returns an error when Supabase rejects the ID token', async () => {
      mockGoogleSignin.signIn.mockResolvedValue({
        data: { idToken: 'google-id-token' },
      } as Awaited<ReturnType<typeof GoogleSignin.signIn>>);
      mockSupabase.auth.signInWithIdToken.mockResolvedValue({
        data: null,
        error: new Error('invalid token'),
      });

      const result = await signInWithGoogle();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(new Error('invalid token'));
    });
  });

  describe('signInWithApple', () => {
    it('exchanges the Apple identity token for a Supabase session', async () => {
      mockAppleAuthentication.signInAsync.mockResolvedValue({
        identityToken: 'apple-identity-token',
        fullName: null,
      } as Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>);
      mockSupabase.auth.signInWithIdToken.mockResolvedValue({
        data: { session: { access_token: 'abc123' } },
        error: null,
      });

      const result = await signInWithApple();

      expect(mockSupabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'apple',
        token: 'apple-identity-token',
      });
      expect(result).toEqual({ data: { session: { access_token: 'abc123' } }, error: null });
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it('persists the full name on first sign-in', async () => {
      mockAppleAuthentication.signInAsync.mockResolvedValue({
        identityToken: 'apple-identity-token',
        fullName: { givenName: 'Ada', familyName: 'Lovelace' },
      } as Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>);
      mockSupabase.auth.signInWithIdToken.mockResolvedValue({
        data: { session: { access_token: 'abc123' } },
        error: null,
      });

      await signInWithApple();

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: { full_name: 'Ada Lovelace' },
      });
    });

    it('returns an error and reports to Sentry when no identityToken is returned', async () => {
      mockAppleAuthentication.signInAsync.mockResolvedValue({
        identityToken: null,
        fullName: null,
      } as Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>);

      const result = await signInWithApple();

      expect(mockCaptureException).toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(mockSupabase.auth.signInWithIdToken).not.toHaveBeenCalled();
    });

    it('returns a cancellation error when the user cancels, without reporting to Sentry', async () => {
      mockAppleAuthentication.signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });

      const result = await signInWithApple();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(ExpectedSocialAuthError);
      expect(result.error?.message).toBe('Authentication was cancelled');
      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    // Apple's generic native failure (code 1000) — thrown by
    // ASAuthorizationController itself, almost always because the signed-in
    // Apple ID isn't set up for Sign In with Apple. Confirmed via Sentry
    // (TEMUR-MOBILE-2) that this reaches real users on production builds, so
    // it gets an actionable message instead of Apple's raw "unknown reason"
    // text — and since it isn't a bug in this app, it shouldn't page Sentry.
    it('returns an actionable message for an unknown authorization failure, without reporting to Sentry', async () => {
      mockAppleAuthentication.signInAsync.mockRejectedValue({
        code: 'ERR_REQUEST_UNKNOWN',
        message: 'The authorization attempt failed for an unknown reason',
      });

      const result = await signInWithApple();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(ExpectedSocialAuthError);
      expect(result.error?.message).toMatch(/sign in with apple isn't available/i);
      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('signInWithProvider', () => {
    it('dispatches to signInWithGoogle', async () => {
      mockGoogleSignin.signIn.mockResolvedValue({
        data: { idToken: 'google-id-token' },
      } as Awaited<ReturnType<typeof GoogleSignin.signIn>>);
      mockSupabase.auth.signInWithIdToken.mockResolvedValue({
        data: { session: { access_token: 'abc123' } },
        error: null,
      });

      await signInWithProvider('google');

      expect(mockSupabase.auth.signInWithIdToken).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      );
    });

    it('dispatches to signInWithApple', async () => {
      mockAppleAuthentication.signInAsync.mockResolvedValue({
        identityToken: 'apple-identity-token',
        fullName: null,
      } as Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>);
      mockSupabase.auth.signInWithIdToken.mockResolvedValue({
        data: { session: { access_token: 'abc123' } },
        error: null,
      });

      await signInWithProvider('apple');

      expect(mockSupabase.auth.signInWithIdToken).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'apple' })
      );
    });
  });
});
