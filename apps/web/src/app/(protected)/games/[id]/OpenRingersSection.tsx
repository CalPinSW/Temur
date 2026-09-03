'use client';

import { useState, useTransition } from 'react';
import { openGameToRingers } from './ringersActions';

export function OpenRingersSection({ gameId, groupId }: { gameId: string; groupId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(
    'This game is now open to ringers — add one if you know someone who can play!'
  );
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError('');
    startTransition(async () => {
      const { error } = await openGameToRingers(gameId, groupId, message);
      if (error) {
        setError(error);
        return;
      }
      setIsOpen(false);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-secondary">Ringers</h2>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
      >
        {isOpen ? 'Hide' : 'Open to Ringers'}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
          <p className="text-xs text-text-tertiary">
            Every group member will get a push notification with this message.
          </p>
          {error && <p className="text-sm text-error">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="self-start rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? 'Sending…' : 'Send Notifications'}
          </button>
        </div>
      )}
    </div>
  );
}
