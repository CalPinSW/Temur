'use client';

import { useState, useTransition } from 'react';
import { publishGameNow } from './actions';

export function PublishGameButton({ gameId }: { gameId: string }) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError('');
    startTransition(async () => {
      const result = await publishGameNow(gameId);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="self-start rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Publishing…' : 'Make Visible Now'}
      </button>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
