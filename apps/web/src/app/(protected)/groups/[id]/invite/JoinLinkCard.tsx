'use client';

import { useState, useTransition } from 'react';
import { formatDate } from '@temur/shared';
import { getOrCreateJoinLink } from './actions';

export function JoinLinkCard({ groupId }: { groupId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const { data, error } = await getOrCreateJoinLink(groupId);
      if (error || !data) {
        setError(error ?? 'Failed to create join link. Please try again.');
        return;
      }
      setLink(`${window.location.origin}/groups/join/${data.token}`);
      setExpiresAt(data.expires_at);
    });
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <span className="text-sm font-medium text-text-secondary">Join Link</span>
      <p className="text-sm text-text-secondary">
        Share a link that lets anyone join this group directly.
      </p>

      {link ? (
        <>
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
          {expiresAt && (
            <span className="text-xs text-text-tertiary">
              Expires {formatDate(expiresAt)}
            </span>
          )}
        </>
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
