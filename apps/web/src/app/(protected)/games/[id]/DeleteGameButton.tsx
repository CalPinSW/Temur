'use client';

import { useTransition } from 'react';
import { deleteGame } from './actions';

export function DeleteGameButton({ gameId }: { gameId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!window.confirm('Delete this game? This cannot be undone from the app.')) return;
    startTransition(async () => {
      const result = await deleteGame(gameId);
      if (result?.error) window.alert(result.error);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-sm font-medium text-error hover:opacity-80 disabled:opacity-60"
    >
      {isPending ? 'Deleting…' : 'Delete Game'}
    </button>
  );
}
