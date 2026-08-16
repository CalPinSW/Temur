'use server';

import { redirect } from 'next/navigation';
import { getAuthErrorMessage } from '@temur/shared';
import { createClient } from '@/lib/supabase/server';

export interface ResetPasswordState {
  error?: string;
}

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }
  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: getAuthErrorMessage(error) };
  }

  redirect('/games');
}
