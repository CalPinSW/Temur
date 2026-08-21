jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: jest.fn(() => 'temur://auth/callback'),
}));

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

jest.mock('@/services/socialAuthService', () => ({
  __esModule: true,
  signInWithProvider: jest.fn(),
  // A real class (not a jest.fn stub) so `instanceof` checks in authStore.ts
  // behave the same as production, without loading the real module — which
  // would pull in @react-native-google-signin/google-signin's native
  // GoogleSignin.configure() at module scope, unmocked in this test file.
  ExpectedSocialAuthError: class ExpectedSocialAuthError extends Error {},
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { signInWithProvider, ExpectedSocialAuthError } from '@/services/socialAuthService';
import { Profile } from '@temur/shared';
import { useAuthStore } from '@/store/authStore';

const mockSupabase = supabase as unknown as SupabaseMock;
const mockSignInWithProvider = signInWithProvider as jest.Mock;
const mockMakeRedirectUri = makeRedirectUri as jest.Mock;
const mockCaptureException = Sentry.captureException as jest.Mock;

const initialState = useAuthStore.getState();

function fakeUser(id: string): User {
  return { id } as unknown as User;
}

function fakeProfile(id: string): Profile {
  return { id } as unknown as Profile;
}

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState(initialState, true);
  });

  describe('signUp', () => {
    it('signs up successfully', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { identities: [{ id: '1' }] } },
        error: null,
      });

      const result = await useAuthStore.getState().signUp({
        email: 'a@b.com',
        password: 'password123',
        username: 'alice',
        displayName: 'Alice',
      });

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'a@b.com',
          password: 'password123',
          options: expect.objectContaining({
            data: { username: 'alice', display_name: 'Alice' },
          }),
        })
      );
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('rejects when the email already exists via OAuth', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { identities: [] } },
        error: null,
      });

      const result = await useAuthStore.getState().signUp({
        email: 'a@b.com',
        password: 'password123',
        username: 'alice',
        displayName: 'Alice',
      });

      expect(result.error?.message).toMatch(/already exists/i);
    });

    it('returns the supabase error on failure', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: new Error('weak password'),
      });

      const result = await useAuthStore.getState().signUp({
        email: 'a@b.com',
        password: '123',
        username: 'alice',
        displayName: 'Alice',
      });

      expect(result.error?.message).toBe('weak password');
    });
  });

  describe('signIn', () => {
    it('signs in successfully', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

      const result = await useAuthStore.getState().signIn({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(result.error).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('returns the supabase error on failure', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: new Error('invalid credentials'),
      });

      const result = await useAuthStore.getState().signIn({
        email: 'a@b.com',
        password: 'wrong',
      });

      expect(result.error?.message).toBe('invalid credentials');
    });
  });

  describe('signInWithSocial', () => {
    it('fetches the profile after a successful social sign-in', async () => {
      mockSignInWithProvider.mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
        error: null,
      });
      const builder = createQueryBuilder({
        data: { id: 'user-1', username: 'alice' },
        error: null,
      });
      mockFromTables(mockSupabase, { profiles: builder });

      const result = await useAuthStore.getState().signInWithSocial('google');

      expect(result.error).toBeNull();
      expect(useAuthStore.getState().profile).toEqual({ id: 'user-1', username: 'alice' });
    });

    it('returns the error and reports to Sentry when the provider sign-in fails unexpectedly', async () => {
      mockSignInWithProvider.mockResolvedValue({ data: null, error: new Error('boom') });

      const result = await useAuthStore.getState().signInWithSocial('apple');

      expect(result.error?.message).toBe('boom');
      expect(mockCaptureException).toHaveBeenCalled();
    });

    // socialAuthService already decided a cancelled/unavailable sign-in
    // isn't a bug (see ExpectedSocialAuthError) — this only re-throws the
    // error here to short-circuit the profile fetch, so it must not get
    // re-reported to Sentry on the way back out.
    it('returns the error without reporting to Sentry when the provider sign-in fails expectedly', async () => {
      mockSignInWithProvider.mockResolvedValue({
        data: null,
        error: new ExpectedSocialAuthError('cancelled'),
      });

      const result = await useAuthStore.getState().signInWithSocial('apple');

      expect(result.error?.message).toBe('cancelled');
      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    // withTimeout's losing setTimeout(5000) is never cleared, so run these
    // under fake timers to avoid leaking a real 5s timer past the test.
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('clears user, session, and profile', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      useAuthStore.setState({
        user: fakeUser('user-1'),
        session: {} as unknown as Session,
        profile: fakeProfile('user-1'),
      });

      await useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('still clears local state when signOut times out', async () => {
      mockSupabase.auth.signOut.mockImplementation(() => new Promise(() => {}));
      useAuthStore.setState({ user: fakeUser('user-1') });

      const promise = useAuthStore.getState().signOut();
      jest.advanceTimersByTime(5000);
      await promise;

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('deleteAccount', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('invokes delete-account, signs out locally, and clears state', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      useAuthStore.setState({
        user: fakeUser('user-1'),
        session: {} as unknown as Session,
        profile: fakeProfile('user-1'),
      });

      const { error } = await useAuthStore.getState().deleteAccount();

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('delete-account');
      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(error).toBeNull();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('returns an error and leaves state untouched when the function call fails', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error('not authorized'),
      });
      useAuthStore.setState({
        user: fakeUser('user-1'),
        session: {} as unknown as Session,
        profile: fakeProfile('user-1'),
      });

      const { error } = await useAuthStore.getState().deleteAccount();

      expect(error).toBeInstanceOf(Error);
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
      expect(useAuthStore.getState().user).not.toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('requests a password reset email with a reset-password redirect', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await useAuthStore.getState().resetPassword('a@b.com');

      expect(result.error).toBeNull();
      expect(mockMakeRedirectUri).toHaveBeenCalledWith({
        scheme: 'temur',
        path: 'reset-password',
      });
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.objectContaining({ redirectTo: 'temur://auth/callback' })
      );
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('returns the supabase error on failure', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: new Error('rate limited'),
      });

      const result = await useAuthStore.getState().resetPassword('a@b.com');

      expect(result.error?.message).toBe('rate limited');
    });
  });

  describe('updatePasswordAfterRecovery', () => {
    it('sets the new password and clears isPasswordRecovery', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null });
      useAuthStore.setState({ isPasswordRecovery: true });

      const result = await useAuthStore.getState().updatePasswordAfterRecovery('new-password-123');

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'new-password-123',
      });
      expect(useAuthStore.getState().isPasswordRecovery).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('leaves isPasswordRecovery set on failure', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: new Error('weak password') });
      useAuthStore.setState({ isPasswordRecovery: true });

      const result = await useAuthStore.getState().updatePasswordAfterRecovery('123');

      expect(result.error?.message).toBe('weak password');
      expect(useAuthStore.getState().isPasswordRecovery).toBe(true);
    });
  });

  describe('fetchProfile', () => {
    it('sets the profile on success', async () => {
      const builder = createQueryBuilder({
        data: { id: 'user-1', username: 'alice' },
        error: null,
      });
      mockFromTables(mockSupabase, { profiles: builder });

      await useAuthStore.getState().fetchProfile('user-1');

      expect(useAuthStore.getState().profile).toEqual({ id: 'user-1', username: 'alice' });
    });

    it('clears the profile on error', async () => {
      useAuthStore.setState({ profile: fakeProfile('stale') });
      const builder = createQueryBuilder({ data: null, error: new Error('not found') });
      mockFromTables(mockSupabase, { profiles: builder });

      await useAuthStore.getState().fetchProfile('user-1');

      expect(useAuthStore.getState().profile).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('updates and stores the returned profile', async () => {
      useAuthStore.setState({ user: fakeUser('user-1') });
      const builder = createQueryBuilder({
        data: { id: 'user-1', username: 'new-name' },
        error: null,
      });
      mockFromTables(mockSupabase, { profiles: builder });

      const result = await useAuthStore.getState().updateProfile({ username: 'new-name' });

      expect(result.error).toBeNull();
      expect(builder.update).toHaveBeenCalledWith({ username: 'new-name' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
      expect(useAuthStore.getState().profile).toEqual({ id: 'user-1', username: 'new-name' });
    });

    it('rejects when there is no logged-in user', async () => {
      useAuthStore.setState({ user: null });

      const result = await useAuthStore.getState().updateProfile({ username: 'new-name' });

      expect(result.error?.message).toBe('No user logged in');
    });
  });
});
