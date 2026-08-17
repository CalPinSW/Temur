// Google's Identity Services flow wants the SHA-256 hash of the nonce (it
// checks the hash embedded in the ID token against what it was given), while
// Supabase's signInWithIdToken verifies against the original, unhashed
// value — so callers need both. Apple's flow uses the raw nonce everywhere,
// no hashing.
export async function generateNonce(): Promise<{ nonce: string; hashedNonce: string }> {
  const nonce = crypto.randomUUID();
  const encoded = new TextEncoder().encode(nonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { nonce, hashedNonce };
}
