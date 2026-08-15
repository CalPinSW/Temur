'use client';

import { useTransition } from 'react';
import { removeRinger } from './ringersActions';

export function RemoveRingerButton({
  gameId,
  playerGameId,
  ringerName,
}: {
  gameId: string;
  playerGameId: string;
  ringerName: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!window.confirm(`Remove ${ringerName} from this game?`)) return;
    startTransition(async () => {
      const { error } = await removeRinger(gameId, playerGameId);
      if (error) window.alert(error);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs font-medium text-text-tertiary hover:text-error disabled:opacity-60"
      aria-label={`Remove ${ringerName}`}
    >
      ✕
    </button>
  );
}
