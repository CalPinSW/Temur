'use client';

import { useState, useTransition } from 'react';
import { type SavedRinger } from '@temur/shared';
import { addSavedRinger, deleteSavedRinger } from './actions';

export function SavedRingersList({ initialRingers }: { initialRingers: SavedRinger[] }) {
  const [ringers, setRingers] = useState(initialRingers);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName) return;

    startTransition(async () => {
      const { error, id } = await addSavedRinger(trimmedName);
      if (error || !id) {
        setError(error ?? 'Failed to save ringer. Please try again.');
        return;
      }
      setRingers((prev) => [
        { id, user_id: '', name: trimmedName, created_at: '', updated_at: '' },
        ...prev.filter((r) => r.name !== trimmedName),
      ]);
      setName('');
    });
  };

  const handleDelete = (ringer: SavedRinger) => {
    if (!window.confirm(`Remove ${ringer.name} from your saved ringers?`)) return;

    startTransition(async () => {
      const { error } = await deleteSavedRinger(ringer.id);
      if (error) {
        window.alert(error);
        return;
      }
      setRingers((prev) => prev.filter((r) => r.id !== ringer.id));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        <label htmlFor="ringerName" className="text-sm font-medium text-text-secondary">
          Ringer&apos;s name
        </label>
        <div className="flex gap-2">
          <input
            id="ringerName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Smith"
            className="flex-1 rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !name.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? 'Adding…' : 'Add Ringer'}
          </button>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>

      {ringers.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No saved ringers yet. Ringers you add to a game are saved here automatically, or add one
          above to have it ready next time.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border bg-card">
          {ringers.map((ringer) => (
            <div key={ringer.id} className="flex items-center justify-between px-4 py-3">
              <span className="font-medium text-text">{ringer.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(ringer)}
                disabled={isPending}
                className="text-text-tertiary hover:text-error disabled:opacity-60"
                aria-label={`Remove ${ringer.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
