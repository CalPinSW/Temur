const DEFAULT_REDIRECT = '/games';

// Query-param-supplied redirect targets (e.g. /login?redirect=...) are
// attacker-controllable, so only same-origin relative paths survive — a
// value like "https://evil.com" or "//evil.com" is rejected in favor of the
// default rather than ever reaching next/navigation's redirect().
export function sanitizeRedirectPath(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_REDIRECT;
  }
  return value;
}
