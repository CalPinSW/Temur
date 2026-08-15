'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type SocialProvider = 'google' | 'apple';

export interface SocialSignInState {
  error?: string;
}

export async function signInWithProvider(provider: SocialProvider): Promise<SocialSignInState> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return { error: error?.message ?? 'Failed to start sign in. Please try again.' };
  }

  redirect(data.url);
}
