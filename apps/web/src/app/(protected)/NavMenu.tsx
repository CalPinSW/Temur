'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RealtimeBadge } from './RealtimeBadge';

interface NavMenuProps {
  userId: string;
  pendingRequestCount: number;
  pendingGroupInviteCount: number;
}

export function NavMenu({ userId, pendingRequestCount, pendingGroupInviteCount }: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function buildItems(variant: 'desktop' | 'mobile') {
    return [
      { href: '/games', label: 'Games' },
      {
        href: '/friends',
        label: 'Friends',
        badge: (
          <RealtimeBadge
            channelName={`friend-requests-badge-${variant}`}
            table="friendships"
            filters={[
              { column: 'friend_id', value: userId },
              { column: 'status', value: 'pending' },
            ]}
            initialCount={pendingRequestCount}
          />
        ),
      },
      {
        href: '/groups',
        label: 'Groups',
        badge: (
          <RealtimeBadge
            channelName={`group-invites-badge-${variant}`}
            table="group_invitations"
            filters={[{ column: 'invited_user_id', value: userId }]}
            initialCount={pendingGroupInviteCount}
          />
        ),
      },
      { href: '/profile', label: 'Account' },
    ];
  }

  return (
    <div ref={rootRef} className="relative flex items-center">
      <div className="hidden items-center gap-4 sm:flex">
        {buildItems('desktop').map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center text-sm text-text-secondary hover:text-text"
          >
            {item.label}
            {item.badge}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Open menu"
        className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background-secondary hover:text-text sm:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-border bg-card py-1 shadow-lg sm:hidden">
          {buildItems('mobile').map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-2 text-sm text-text hover:bg-background-secondary"
            >
              {item.label}
              {item.badge}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
