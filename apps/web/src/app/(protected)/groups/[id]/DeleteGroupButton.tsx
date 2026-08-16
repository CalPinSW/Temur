'use client';

import { useTransition } from 'react';
import { deleteGroup } from './actions';

export function DeleteGroupButton({ groupId }: { groupId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (
      !window.confirm(
        'Delete this group? This will also delete all of its games. This cannot be undone from the app.'
      )
    )
      return;

    startTransition(async () => {
      const result = await deleteGroup(groupId);
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
      {isPending ? 'Deleting…' : 'Delete Group'}
    </button>
  );
}
