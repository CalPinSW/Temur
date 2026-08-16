import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { AuthState, Profile, SignUpCredentials, SignInCredentials } from '@temur/shared';
import { makeRedirectUri } from 'expo-auth-session';
import * as Sentry from '@sentry/react-native';

function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  ms: number,
  operation: string
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;
  initialize: () => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<{ error: Error | null }>;
  signIn: (credentials: SignInCredentials) => Promise<{ error: Error | null }>;
  signInWithSocial: (provider: 'google' | 'apple') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),

  initialize: async () => {
    try {
      set({ isLoading: true });
      // Add timeout to prevent hanging on Android
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => {
        setTimeout(() => {
          console.warn('[AuthStore] getSession timed out after 10s');
          resolve({ data: { session: null } });
        }, 10000);
      });

      const {
        data: { session },
      } = await Promise.race([sessionPromise, timeoutPromise]);

      if (session?.user) {
        set({ user: session.user, session });
        // Fetch profile with timeout
        try {
          await get().fetchProfile(session.user.id);
        } catch (profileError) {
          console.error('[AuthStore] Profile fetch failed during init:', profileError);
          Sentry.captureException(profileError);
          // Continue initialization even if profile fetch fails
        }
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ user: session?.user ?? null, session });

        // Fetch profile on sign in and initial session
        // OAuth sign-ins also handle profile fetch explicitly after setSession completes
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          try {
            await get().fetchProfile(session.user.id);
          } catch (profileError) {
            console.error('[AuthStore] Profile fetch failed on auth change:', profileError);
            Sentry.captureException(profileError);
          }
        } else if (event === 'SIGNED_OUT' && !session) {
          set({ profile: null });
        }
      });
    } catch (error) {
      console.error('[AuthStore] Error initializing auth:', error);
      Sentry.captureException(error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signUp: async ({ email, password, username, displayName }) => {
    try {
      set({ isLoading: true });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: makeRedirectUri({ scheme: 'temur', path: 'auth/callback' }),
          data: {
            username,
            display_name: displayName,
          },
        },
      });

      if (error) throw error;

      // Supabase returns a user with no identities if email exists with OAuth
      if (data?.user?.identities?.length === 0) {
        throw new Error(
          'An account with this email already exists. Please sign in using Google or Apple.'
        );
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      Sentry.captureException(error);
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async ({ email, password }) => {
    try {
      set({ isLoading: true });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      Sentry.captureException(error);
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithSocial: async (provider) => {
    try {
      const { signInWithProvider } = await import('@/services/socialAuthService');
      const { data, error } = await signInWithProvider(provider);

      if (error) throw error;

      // Fetch profile after setSession completes (session is already persisted)
      if (data?.session?.user) {
        await get().fetchProfile(data.session.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Social sign in error:', error);
      Sentry.captureException(error);
      return { error: error as Error };
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });

      try {
        // 'local' scope only ends this device's session — the default
        // 'global' scope revokes every session for this user everywhere,
        // which would also sign them out of the web app.
        await withTimeout(supabase.auth.signOut({ scope: 'local' }), 5000, 'signOut');
      } catch (timeoutError) {
        console.error('Sign out timeout, clearing local state:', timeoutError);
        Sentry.captureException(timeoutError);
      }

      set({ user: null, session: null, profile: null });
    } catch (error) {
      console.error('Sign out error:', error);
      Sentry.captureException(error);
      set({ user: null, session: null, profile: null });
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email) => {
    try {
      set({ isLoading: true });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: makeRedirectUri({
          scheme: 'temur',
          path: 'reset-password',
        }),
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      Sentry.captureException(error);
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async (userId) => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).single(),
        15000,
        'fetchProfile'
      );

      if (error) {
        console.error('Profile fetch error:', error);
        Sentry.captureException(error);
        throw error;
      }

      set({ profile: data as Profile });
    } catch (error) {
      console.error('Fetch profile error:', error instanceof Error ? error.message : error);
      Sentry.captureException(error);
      set({ profile: null });
    }
  },

  updateProfile: async (updates) => {
    try {
      set({ isLoading: true });

      const { user } = get();
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      set({ profile: data as Profile });
      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      Sentry.captureException(error);
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },
}));
