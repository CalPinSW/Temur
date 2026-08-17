// Every provider we use here (Google Identity Services, Apple JS) wants the
// SHA-256 hash of the nonce — it echoes that value back verbatim in the ID
// token's nonce claim. Supabase's signInWithIdToken then hashes the raw
// nonce itself and compares against that claim, so it needs the *unhashed*
// value — callers need both.
export async function generateNonce(): Promise<{ nonce: string; hashedNonce: string }> {
  const nonce = crypto.randomUUID();
  const encoded = new TextEncoder().encode(nonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { nonce, hashedNonce };
}
