'use server';

import { getAuthErrorMessage } from '@temur/shared';
import { createClient } from '@/lib/supabase/server';

export interface ForgotPasswordState {
  error?: string;
  success?: boolean;
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '');

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Recovery links deliver tokens as a URL hash fragment, not a ?code=
    // param — the server never sees a fragment, so this bypasses
    // /auth/callback entirely and goes straight to /reset-password, which
    // handles the fragment client-side (see ResetPasswordForm).
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (error) {
    return { error: getAuthErrorMessage(error) };
  }

  return { success: true };
}
