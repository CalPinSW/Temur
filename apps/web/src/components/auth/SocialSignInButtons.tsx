'use client';

import { useState, useTransition } from 'react';
import { signInWithProvider, type SocialProvider } from '@/lib/auth/socialActions';

export function SocialSignInButtons() {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleClick = (provider: SocialProvider) => {
    setError('');
    setPendingProvider(provider);
    startTransition(async () => {
      const { error } = await signInWithProvider(provider);
      if (error) setError(error);
      setPendingProvider(null);
    });
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-tertiary">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => handleClick('google')}
        disabled={isPending}
        className="rounded-lg border border-border px-4 py-2 font-medium text-text transition-colors hover:bg-background-secondary disabled:opacity-60"
      >
        {pendingProvider === 'google' ? 'Redirecting…' : 'Google'}
      </button>
      <button
        type="button"
        onClick={() => handleClick('apple')}
        disabled={isPending}
        className="rounded-lg border border-border px-4 py-2 font-medium text-text transition-colors hover:bg-background-secondary disabled:opacity-60"
      >
        {pendingProvider === 'apple' ? 'Redirecting…' : 'Apple'}
      </button>

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
