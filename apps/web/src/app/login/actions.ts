'use server';

import { redirect } from 'next/navigation';
import { getAuthErrorMessage } from '@temur/shared';
import { createClient } from '@/lib/supabase/server';
import { sanitizeRedirectPath } from '@/lib/redirect';

export interface AuthFormState {
  error?: string;
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: getAuthErrorMessage(error) };
  }

  redirect(sanitizeRedirectPath(formData.get('redirect')));
}
