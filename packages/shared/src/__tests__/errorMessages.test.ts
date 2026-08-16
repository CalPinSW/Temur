import { getAuthErrorMessage, getAvatarUploadErrorMessage } from '../utils/errorMessages';

describe('getAuthErrorMessage', () => {
  it('maps a duplicate-signup error to a message pointing at sign in', () => {
    const message = getAuthErrorMessage({ code: 'user_already_exists', message: 'User already registered' });
    expect(message).toContain('already exists');
    expect(message).toContain('signing in');
  });

  it('maps invalid credentials without revealing which of email/password was wrong', () => {
    const message = getAuthErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' });
    expect(message).toBe('Incorrect email or password.');
  });

  it('passes through the weak-password message as-is (it already reflects the real policy)', () => {
    const message = getAuthErrorMessage({
      code: 'weak_password',
      message: 'Password should be at least 6 characters.',
    });
    expect(message).toBe('Password should be at least 6 characters.');
  });

  it('maps a rate-limit code to a wait-and-retry message', () => {
    expect(
      getAuthErrorMessage({ code: 'over_email_send_rate_limit', message: 'rate limited' })
    ).toContain('Too many attempts');
  });

  it('falls back to a 429 status when the code is missing or unrecognized', () => {
    expect(getAuthErrorMessage({ status: 429, message: 'rate limited' })).toContain('Too many attempts');
  });

  it('falls through to the raw message for an unrecognized error', () => {
    const message = getAuthErrorMessage({ code: 'some_new_error', message: 'Something unusual happened' });
    expect(message).toBe('Something unusual happened');
  });
});

describe('getAvatarUploadErrorMessage', () => {
  it('recognizes the real Storage API oversized-file message', () => {
    const message = getAvatarUploadErrorMessage({
      message: 'The object exceeded the maximum allowed size',
    });
    expect(message).toContain('too large');
  });

  it('recognizes the real Storage API wrong-mime-type message', () => {
    const message = getAvatarUploadErrorMessage({
      message: 'mime type application/pdf is not supported',
    });
    expect(message).toContain('JPEG, PNG, WebP, or GIF');
  });

  it('falls back to a generic message for an unrecognized storage error', () => {
    const message = getAvatarUploadErrorMessage({ message: 'network request failed' });
    expect(message).toBe('Failed to upload avatar. Please try again.');
  });
});
