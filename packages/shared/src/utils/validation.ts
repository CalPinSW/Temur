export const formatUsername = (input: string): string => input.toLowerCase().replace(/[^a-z0-9_]/g, '');

export const validateUsername = (username: string): string | null => {
  if (!username.trim()) {
    return 'Username cannot be empty';
  }

  if (username.length < 3) {
    return 'Username must be at least 3 characters';
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }

  return null;
};

// Matches the `avatars` bucket's file_size_limit / allowed_mime_types
// (supabase/migrations — search "avatars" bucket). Validating client-side
// gives instant feedback without a round trip; the server still enforces
// the same limits independently.
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const validateAvatarFile = (sizeBytes: number, mimeType: string): string | null => {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(mimeType)) {
    return 'Please choose a JPEG, PNG, WebP, or GIF image.';
  }

  if (sizeBytes > MAX_AVATAR_SIZE_BYTES) {
    const maxMb = MAX_AVATAR_SIZE_BYTES / (1024 * 1024);
    return `That image is too large — please choose one under ${maxMb}MB.`;
  }

  return null;
};
