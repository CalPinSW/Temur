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
