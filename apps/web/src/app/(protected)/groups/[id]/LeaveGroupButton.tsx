'use client';

import { useTransition } from 'react';
import { leaveGroup } from './actions';

export function LeaveGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!window.confirm(`Are you sure you want to leave ${groupName}?`)) return;

    startTransition(async () => {
      const { error } = await leaveGroup(groupId);
      if (error) window.alert(error);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-sm font-medium text-text-secondary hover:text-error disabled:opacity-60"
    >
      Leave Group
    </button>
  );
}
