'use client';

import { useState, useTransition } from 'react';
import { type Profile } from '@temur/shared';
import { inviteFriendsToGame } from './gameInvitationActions';

export function InviteFriendsSection({
  gameId,
  invitableFriends,
  isGroupGame,
}: {
  gameId: string;
  invitableFriends: Profile[];
  isGroupGame: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const toggleFriend = (friendId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleSubmit = () => {
    setError('');
    startTransition(async () => {
      const { error } = await inviteFriendsToGame(gameId, Array.from(selectedIds));
      if (error) {
        setError(error);
        return;
      }
      setSelectedIds(new Set());
      setIsOpen(false);
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-light px-3 py-2">
      <h2 className="text-sm font-semibold text-text-secondary">Invite Friends</h2>
      {isGroupGame && (
        <p className="text-xs text-text-tertiary">
          Invited friends get access to this game only — they won&apos;t be added to the group.
        </p>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
      >
        {isOpen ? 'Hide' : 'Invite More Friends'}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2">
          {invitableFriends.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {isGroupGame
                ? 'All your friends are already in this group, already signed up, or you have no friends to invite.'
                : 'All your friends are already signed up, or you have no friends to invite.'}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {invitableFriends.map((friend) => (
                <label
                  key={friend.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text hover:bg-background-secondary"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(friend.id)}
                    onChange={() => toggleFriend(friend.id)}
                  />
                  {friend.display_name || friend.username}
                </label>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-error">{error}</p>}

          {invitableFriends.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || selectedIds.size === 0}
              className="self-start rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isPending ? 'Sending…' : 'Send Invites'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
