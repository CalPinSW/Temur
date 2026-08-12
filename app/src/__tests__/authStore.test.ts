jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: jest.fn(() => 'matchday://auth/callback'),
}));

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

jest.mock('@/services/socialAuthService', () => ({
  __esModule: true,
  signInWithProvider: jest.fn(),
}));

import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { signInWithProvider } from '@/services/socialAuthService';
import { Profile } from '@/types/auth';
import { useAuthStore } from '@/store/authStore';

const mockSupabase = supabase as unknown as SupabaseMock;
const mockSignInWithProvider = signInWithProvider as jest.Mock;

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

    it('returns the error when the provider sign-in fails', async () => {
      mockSignInWithProvider.mockResolvedValue({ data: null, error: new Error('cancelled') });

      const result = await useAuthStore.getState().signInWithSocial('apple');

      expect(result.error?.message).toBe('cancelled');
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

  describe('resetPassword', () => {
    it('requests a password reset email', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await useAuthStore.getState().resetPassword('a@b.com');

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.objectContaining({ redirectTo: 'matchday://auth/callback' })
      );
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
