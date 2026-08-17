'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type SocialProvider = 'google' | 'apple';

export interface SocialSignInState {
  error?: string;
}

export async function signInWithIdToken(
  provider: SocialProvider,
  token: string,
  nonce: string,
  fullName?: string
): Promise<SocialSignInState> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithIdToken({ provider, token, nonce });

  if (error) {
    return { error: error.message };
  }

  // Apple only ever includes the user's name on the very first sign-in for
  // this app (see SocialSignInButtons), so this is the one chance to persist
  // it — every later sign-in omits it even though the id_token is still valid.
  if (fullName) {
    await supabase.auth.updateUser({ data: { full_name: fullName } });
  }

  redirect('/games');
}
