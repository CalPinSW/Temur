'use client';

import { useRef, useState, useTransition } from 'react';
import { getInitials, type Profile } from '@temur/shared';
import { searchUsers, sendFriendRequest } from './actions';

export function FriendSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [isSearching, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        setResults(await searchUsers(value));
      });
    }, 300);
  };

  const handleAdd = (friendId: string) => {
    setSentIds((prev) => new Set(prev).add(friendId));
    startSearch(async () => {
      const { error } = await sendFriendRequest(friendId);
      if (error) {
        window.alert(error);
        setSentIds((prev) => {
          const next = new Set(prev);
          next.delete(friendId);
          return next;
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search by username or name..."
        autoComplete="off"
        className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
      />

      {query.trim().length < 2 ? (
        <p className="text-center text-sm text-text-secondary">
          Enter at least 2 characters to search
        </p>
      ) : results.length === 0 && !isSearching ? (
        <p className="text-center text-sm text-text-secondary">No users found</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border bg-card">
          {results.map((profile) => {
            const hasSent = sentIds.has(profile.id);
            return (
              <div key={profile.id} className="flex items-center gap-3 px-4 py-3">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {getInitials(profile.display_name, profile.username)}
                  </div>
                )}
                <div className="flex flex-1 flex-col">
                  <span className="font-medium text-text">
                    {profile.display_name || profile.username}
                  </span>
                  <span className="text-sm text-text-secondary">@{profile.username}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(profile.id)}
                  disabled={hasSent}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {hasSent ? 'Sent' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
