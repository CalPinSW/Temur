'use client';

import { useTransition } from 'react';
import { cancelGameSeries } from '../../groups/[id]/series/actions';

export function CancelSeriesButton({ seriesId, groupId }: { seriesId: string; groupId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (
      !window.confirm(
        'Cancel every upcoming game in this recurring block? Games already played are kept. This cannot be undone.'
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await cancelGameSeries(seriesId, groupId);
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
      {isPending ? 'Cancelling…' : 'Cancel upcoming games in this block'}
    </button>
  );
}
