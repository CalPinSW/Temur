import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Sentry from '@sentry/react-native';
import { supabase } from './supabase';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID,
});

type Provider = 'google' | 'apple';

// Marks a social sign-in failure as a known, user-side condition (cancelled
// the prompt, or their Apple ID isn't set up for Sign In with Apple) rather
// than an app bug — callers use this to skip Sentry reporting for it, since
// reporting it would just be noise, not something fixable in this codebase.
export class ExpectedSocialAuthError extends Error {}

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new Error('No ID token returned from Google Sign-In');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    if ((error as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED) {
      return { data: null, error: new ExpectedSocialAuthError('Authentication was cancelled') };
    }
    console.error('[SocialAuth] Google sign-in error:', error);
    Sentry.captureException(error);
    return { data: null, error: error as Error };
  }
}

export async function signInWithApple() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token returned from Apple Sign-In');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) throw error;

    // Apple only ever includes the user's name on the very first sign-in for
    // this app, so this is the one chance to persist it — every later
    // sign-in's credential.fullName is null even though identityToken is not.
    if (credential.fullName) {
      const fullName = [credential.fullName.givenName, credential.fullName.familyName]
        .filter(Boolean)
        .join(' ');
      if (fullName) {
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      }
    }

    return { data, error: null };
  } catch (error) {
    const code = (error as { code?: string }).code;

    if (code === 'ERR_REQUEST_CANCELED') {
      return { data: null, error: new ExpectedSocialAuthError('Authentication was cancelled') };
    }

    // Apple's generic native failure code, thrown by ASAuthorizationController
    // itself before the app ever sees a token back — in practice this is
    // almost always the signed-in Apple ID not being set up for Sign In with
    // Apple (no two-factor authentication, or not signed in to iCloud) rather
    // than anything this app's code can fix, so it isn't worth reporting.
    if (code === 'ERR_REQUEST_UNKNOWN') {
      return {
        data: null,
        error: new ExpectedSocialAuthError(
          "Sign in with Apple isn't available right now. Make sure you're signed in to iCloud with two-factor authentication enabled, then try again."
        ),
      };
    }

    console.error('[SocialAuth] Apple sign-in error:', error);
    Sentry.captureException(error);
    return { data: null, error: error as Error };
  }
}

export async function signInWithProvider(provider: Provider) {
  return provider === 'google' ? signInWithGoogle() : signInWithApple();
}
