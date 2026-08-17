import { generateNonce } from '../nonce';

describe('generateNonce', () => {
  it('returns a nonce and its SHA-256 hash as a lowercase hex string', async () => {
    const { nonce, hashedNonce } = await generateNonce();

    expect(nonce).toMatch(/^[0-9a-f-]{36}$/);
    expect(hashedNonce).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a different nonce on each call', async () => {
    const first = await generateNonce();
    const second = await generateNonce();

    expect(first.nonce).not.toBe(second.nonce);
    expect(first.hashedNonce).not.toBe(second.hashedNonce);
  });

  it('hashes the same nonce to the same value deterministically', async () => {
    const { nonce, hashedNonce } = await generateNonce();
    const encoded = new TextEncoder().encode(nonce);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const expected = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(hashedNonce).toBe(expected);
  });
});
