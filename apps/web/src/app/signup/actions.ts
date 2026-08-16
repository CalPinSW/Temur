'use server';

import { validateUsername, getAuthErrorMessage } from '@temur/shared';
import { createClient } from '@/lib/supabase/server';

export interface SignUpFormState {
  error?: string;
  success?: boolean;
}

export async function signUp(
  _prevState: SignUpFormState,
  formData: FormData
): Promise<SignUpFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const username = String(formData.get('username') ?? '');
  const displayName = String(formData.get('displayName') ?? '');

  const usernameError = validateUsername(username);
  if (usernameError) {
    return { error: usernameError };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        username,
        display_name: displayName || undefined,
      },
    },
  });

  if (error) {
    return { error: getAuthErrorMessage(error) };
  }

  if (data?.user?.identities?.length === 0) {
    return {
      error: 'An account with this email already exists. Please sign in instead.',
    };
  }

  return { success: true };
}
