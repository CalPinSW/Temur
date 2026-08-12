import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'google' | 'apple';
const redirectTo = makeRedirectUri({
  scheme: 'matchday',
  path: 'auth/callback',
});

export async function signInWithProvider(provider: Provider) {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error(`[SocialAuth] Supabase OAuth error:`, error);
      throw error;
    }
    if (!data.url) {
      console.error('[SocialAuth] No OAuth URL returned from Supabase');
      throw new Error('No OAuth URL returned');
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'success') {
      const { url } = result;

      // Extract tokens from the URL fragment or query params
      const hashParams = url.includes('#') ? url.split('#')[1] : '';
      const queryParamsStr = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';

      const params = new URLSearchParams(hashParams || queryParamsStr);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          console.error('[SocialAuth] Session error:', sessionError);
          throw sessionError;
        }
        return { data: sessionData, error: null };
      }

      // Check for error in URL
      const errorParam = params.get('error');
      const errorDescription = params.get('error_description');
      if (errorParam) {
        console.error(`[SocialAuth] OAuth error in callback: ${errorParam} - ${errorDescription}`);
        throw new Error(errorDescription || errorParam);
      }

      console.error('[SocialAuth] No access token or error in callback URL');
      console.error(`[SocialAuth] Full callback URL: ${url}`);
    } else if (result.type === 'cancel') {
      console.log('[SocialAuth] User cancelled authentication');
    } else {
      console.log(`[SocialAuth] Unexpected result type: ${result.type}`);
    }

    return { data: null, error: new Error('Authentication was cancelled') };
  } catch (error) {
    console.error('[SocialAuth] Exception caught:', error);
    return { data: null, error: error as Error };
  }
}

export async function signInWithGoogle() {
  return signInWithProvider('google');
}

export async function signInWithApple() {
  return signInWithProvider('apple');
}
