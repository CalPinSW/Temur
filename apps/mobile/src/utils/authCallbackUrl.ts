export interface ParsedAuthCallbackUrl {
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  errorDescription: string | null;
}

// Supabase's implicit-flow redirects carry tokens/errors as a URL fragment
// (or, less commonly, as query params) rather than a parseable path — used
// by the password-recovery deep link (useAuthDeepLinks).
export function parseAuthCallbackUrl(url: string): ParsedAuthCallbackUrl {
  const hashParams = url.includes('#') ? url.split('#')[1] : '';
  const queryParamsStr = url.includes('?') ? (url.split('?')[1]?.split('#')[0] ?? '') : '';
  const params = new URLSearchParams(hashParams || queryParamsStr);

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
}
