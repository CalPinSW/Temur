import { useEffect } from 'react';
import { Linking } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { parseAuthCallbackUrl } from '@/utils/authCallbackUrl';

const RESET_PASSWORD_PATH = 'reset-password';

function isResetPasswordUrl(url: string): boolean {
  return url.includes(RESET_PASSWORD_PATH);
}

// Establishes the session from a password-recovery email link and flags it
// as a recovery session (see isPasswordRecovery in authStore) so
// RootNavigator shows ResetPasswordScreen instead of the normal logged-in
// app. Needed because the mobile Supabase client has detectSessionInUrl:
// false (see services/supabase.ts) — nothing parses an incoming URL unless
// we do it ourselves, same as socialAuthService already does for OAuth.
export async function handleAuthDeepLink(url: string): Promise<void> {
  if (!isResetPasswordUrl(url)) return;

  const { accessToken, refreshToken, error, errorDescription } = parseAuthCallbackUrl(url);

  if (error) {
    console.error(`[useAuthDeepLinks] Reset-password link error: ${error} - ${errorDescription}`);
    return;
  }

  if (!accessToken) {
    console.error('[useAuthDeepLinks] No access token in reset-password link');
    return;
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });

  if (sessionError) {
    console.error('[useAuthDeepLinks] Failed to establish recovery session:', sessionError);
    Sentry.captureException(sessionError);
    return;
  }

  useAuthStore.getState().setIsPasswordRecovery(true);
}

export function useAuthDeepLinks() {
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthDeepLink(url);
    });

    return () => subscription.remove();
  }, []);
}
