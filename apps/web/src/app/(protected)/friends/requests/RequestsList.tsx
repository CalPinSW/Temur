'use client';

import { useState, useTransition } from 'react';
import { getInitials, type Profile } from '@temur/shared';
import { acceptRequest, declineRequest } from './actions';

export interface FriendRequest {
  id: string;
  requester: Profile;
}

export function RequestsList({ initialRequests }: { initialRequests: FriendRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [isPending, startTransition] = useTransition();

  const handleAccept = (requestId: string) => {
    startTransition(async () => {
      const { error } = await acceptRequest(requestId);
      if (error) {
        window.alert(error);
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    });
  };

  const handleDecline = (requestId: string) => {
    startTransition(async () => {
      const { error } = await declineRequest(requestId);
      if (error) {
        window.alert(error);
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    });
  };

  if (requests.length === 0) {
    return <p className="text-sm text-text-secondary">No pending requests.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border bg-card">
      {requests.map((request) => (
        <div key={request.id} className="flex items-center gap-3 px-4 py-3">
          {request.requester.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
            <img
              src={request.requester.avatar_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {getInitials(request.requester.display_name, request.requester.username)}
            </div>
          )}
          <div className="flex flex-1 flex-col">
            <span className="font-medium text-text">
              {request.requester.display_name || request.requester.username}
            </span>
            <span className="text-sm text-text-secondary">@{request.requester.username}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAccept(request.id)}
              disabled={isPending}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => handleDecline(request.id)}
              disabled={isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary disabled:opacity-60"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
