import { validateAvatarFile, MAX_AVATAR_SIZE_BYTES } from '../utils/validation';

describe('validateAvatarFile', () => {
  it('accepts a normal-sized image of an allowed type', () => {
    expect(validateAvatarFile(1024 * 1024, 'image/jpeg')).toBeNull();
    expect(validateAvatarFile(1024, 'image/png')).toBeNull();
  });

  it('rejects a file over the size limit', () => {
    const error = validateAvatarFile(MAX_AVATAR_SIZE_BYTES + 1, 'image/jpeg');
    expect(error).not.toBeNull();
    expect(error).toContain('too large');
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateAvatarFile(MAX_AVATAR_SIZE_BYTES, 'image/jpeg')).toBeNull();
  });

  it('rejects a disallowed mime type', () => {
    const error = validateAvatarFile(1024, 'application/pdf');
    expect(error).not.toBeNull();
    expect(error).toContain('JPEG, PNG, WebP, or GIF');
  });
});
