import { parseAuthCallbackUrl } from '@/utils/authCallbackUrl';

describe('parseAuthCallbackUrl', () => {
  it('parses access/refresh tokens from a hash fragment', () => {
    const result = parseAuthCallbackUrl(
      'temur://reset-password#access_token=abc123&refresh_token=refresh456&type=recovery'
    );

    expect(result).toEqual({
      accessToken: 'abc123',
      refreshToken: 'refresh456',
      error: null,
      errorDescription: null,
    });
  });

  it('parses access/refresh tokens from query params when there is no hash', () => {
    const result = parseAuthCallbackUrl(
      'temur://auth/callback?access_token=abc123&refresh_token=refresh456'
    );

    expect(result.accessToken).toBe('abc123');
    expect(result.refreshToken).toBe('refresh456');
  });

  it('parses an error and description from the hash fragment', () => {
    const result = parseAuthCallbackUrl(
      'temur://auth/callback#error=access_denied&error_description=User+denied+access'
    );

    expect(result.error).toBe('access_denied');
    expect(result.errorDescription).toBe('User denied access');
    expect(result.accessToken).toBeNull();
  });

  it('returns all-null fields for a URL with neither tokens nor an error', () => {
    const result = parseAuthCallbackUrl('temur://reset-password');

    expect(result).toEqual({
      accessToken: null,
      refreshToken: null,
      error: null,
      errorDescription: null,
    });
  });
});
