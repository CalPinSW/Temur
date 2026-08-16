'use client';

import { useEffect, useState, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resetPassword, type ResetPasswordState } from './actions';

const initialState: ResetPasswordState = {};

export function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready'>('checking');
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);

  useEffect(() => {
    const supabase = createClient();

    async function establishSession() {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? '',
        });
        // Strip the tokens from the URL regardless of outcome — they're
        // single-use and shouldn't linger in browser history either way.
        window.history.replaceState(null, '', window.location.pathname);

        if (!error) {
          setStatus('ready');
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setStatus('ready');
      } else {
        router.replace('/login');
      }
    }

    establishSession();
  }, [router]);

  if (status === 'checking') {
    return <p className="text-sm text-text-secondary">Verifying your reset link…</p>;
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="newPassword" className="text-sm font-medium text-text-secondary">
          New Password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-text-secondary">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-error-background px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Setting…' : 'Set New Password'}
      </button>
    </form>
  );
}
