// Human-readable messages for anticipated Supabase Auth/Storage errors,
// verified against the actual error shape supabase-js returns (not
// guessed) — see the codes in each case below. Anything unrecognized falls
// through to the raw message rather than a useless generic one, so a
// genuinely unusual error still tells you something.

export interface SupabaseErrorLike {
  code?: string;
  status?: number;
  message: string;
}

export const getAuthErrorMessage = (error: SupabaseErrorLike): string => {
  switch (error.code) {
    case 'user_already_exists':
      return 'An account with this email already exists. Try signing in instead.';
    case 'invalid_credentials':
      return 'Incorrect email or password.';
    case 'email_not_confirmed':
      return 'Please confirm your email address before signing in.';
    case 'same_password':
      return 'Your new password must be different from your current one.';
    case 'weak_password':
      // Supabase's own message already reflects the actual configured
      // password policy (e.g. "Password should be at least 6 characters."),
      // more accurately than a hardcoded string could.
      return error.message;
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
    case 'over_sms_send_rate_limit':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      if (error.status === 429) {
        return 'Too many attempts. Please wait a moment and try again.';
      }
      return error.message;
  }
};

export const getAvatarUploadErrorMessage = (error: SupabaseErrorLike): string => {
  // Verified against the actual Storage API responses for the avatars
  // bucket's file_size_limit / allowed_mime_types (statusCode 413 / 415):
  // "The object exceeded the maximum allowed size" and "mime type
  // <type> is not supported".
  const message = error.message?.toLowerCase() ?? '';
  if (message.includes('exceeded the maximum allowed size')) {
    return 'That image is too large — please choose a smaller one.';
  }
  if (message.includes('mime type')) {
    return 'That file type isn’t supported — please choose a JPEG, PNG, WebP, or GIF image.';
  }
  return 'Failed to upload avatar. Please try again.';
};

const NETWORK_FAILURE_MESSAGES = ['Network request failed', 'Failed to fetch'];

// supabase-js returns a transport failure (the request never reached the
// server) in the same {message, details, hint, code} shape as a real
// database/RPC rejection — usually as a plain object, not an Error — so the
// message text is the only way to tell "no signal" apart from a genuine bug.
export const isNetworkError = (error: unknown): boolean => {
  const message =
    typeof error === 'string'
      ? error
      : typeof error === 'object' &&
          error !== null &&
          typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';
  return NETWORK_FAILURE_MESSAGES.some((text) => message.includes(text));
};

export const NETWORK_ERROR_MESSAGE = "Couldn't connect. Check your connection and try again.";
