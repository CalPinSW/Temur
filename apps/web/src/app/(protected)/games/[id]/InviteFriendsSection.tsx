'use client';

import { useState, useTransition } from 'react';
import { type Profile } from '@temur/shared';
import { inviteFriendsToGame, getOrCreateGameJoinLink } from './gameInvitationActions';

function JoinLinkButton({ gameId }: { gameId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const { data, error } = await getOrCreateGameJoinLink(gameId);
      if (error || !data) {
        setError(error ?? 'Failed to create join link. Please try again.');
        return;
      }
      setLink(`${window.location.origin}/games/join/${data.token}`);
    });
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      {link ? (
        <div className="flex items-center gap-2 rounded-lg border border-input-border bg-input px-3 py-2">
          <span className="flex-1 truncate text-sm text-text">{link}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="self-start rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
        >
          {isPending ? 'Generating…' : 'Get Join Link'}
        </button>
      )}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

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
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-secondary">Invite Friends</h2>
      {isGroupGame && (
        <p className="text-xs text-text-tertiary">
          Invited friends get access to this game only — they won&apos;t be added to the group.
        </p>
      )}

      <JoinLinkButton gameId={gameId} />

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
    </div>
  );
}
