'use client';

import { useTransition } from 'react';
import { removeFriend } from './actions';

export function RemoveFriendButton({
  friendId,
  friendName,
}: {
  friendId: string;
  friendName: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!window.confirm(`Remove ${friendName} as a friend?`)) return;

    const formData = new FormData();
    formData.set('friendId', friendId);
    startTransition(async () => {
      const { error } = await removeFriend({}, formData);
      if (error) window.alert(error);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-lg p-2 text-text-tertiary hover:text-error disabled:opacity-60"
      aria-label={`Remove ${friendName}`}
    >
      ✕
    </button>
  );
}
