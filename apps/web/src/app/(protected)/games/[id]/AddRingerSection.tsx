'use client';

import { useState, useTransition } from 'react';
import { addRinger, getSavedRingerNames } from './ringersActions';

export function AddRingerSection({ gameId }: { gameId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [savedNames, setSavedNames] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && savedNames === null) {
      startTransition(async () => {
        setSavedNames(await getSavedRingerNames());
      });
    }
  };

  const handleSubmit = () => {
    setError('');
    startTransition(async () => {
      const { error } = await addRinger(gameId, name);
      if (error) {
        setError(error);
        return;
      }
      setName('');
      setIsOpen(false);
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-light px-3 py-2">
      <h2 className="text-sm font-semibold text-text-secondary">Add Ringer</h2>
      <button
        type="button"
        onClick={handleToggle}
        className="self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
      >
        {isOpen ? 'Hide' : 'Add a Ringer'}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Smith"
            className="rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />

          {savedNames && savedNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {savedNames.map((savedName) => (
                <button
                  key={savedName}
                  type="button"
                  onClick={() => setName(savedName)}
                  className="rounded-full bg-background-secondary px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-input"
                >
                  {savedName}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="self-start rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? 'Adding…' : 'Add Ringer'}
          </button>
        </div>
      )}
    </section>
  );
}
