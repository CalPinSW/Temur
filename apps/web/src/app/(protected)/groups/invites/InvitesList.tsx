'use client';

import { useState, useTransition } from 'react';
import { type GroupInvitationWithDetails } from '@temur/shared';
import { acceptGroupInvitation, declineGroupInvitation } from './actions';

export function InvitesList({
  initialInvitations,
}: {
  initialInvitations: GroupInvitationWithDetails[];
}) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAccept = (invitation: GroupInvitationWithDetails) => {
    setProcessingId(invitation.id);
    startTransition(async () => {
      const { error } = await acceptGroupInvitation(invitation.id, invitation.group_id);
      setProcessingId(null);
      if (error) {
        window.alert(error);
        return;
      }
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
    });
  };

  const handleDecline = (invitation: GroupInvitationWithDetails) => {
    setProcessingId(invitation.id);
    startTransition(async () => {
      const { error } = await declineGroupInvitation(invitation.id);
      setProcessingId(null);
      if (error) {
        window.alert(error);
        return;
      }
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
    });
  };

  if (invitations.length === 0) {
    return <p className="text-sm text-text-secondary">No pending invites.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border bg-card">
      {invitations.map((invitation) => (
        <div key={invitation.id} className="flex items-center gap-3 px-4 py-3">
          <div className="flex flex-1 flex-col">
            <span className="font-medium text-text">{invitation.group.name}</span>
            <span className="text-sm text-text-secondary">
              Invited by {invitation.inviter.display_name || invitation.inviter.username}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAccept(invitation)}
              disabled={isPending && processingId === invitation.id}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => handleDecline(invitation)}
              disabled={isPending && processingId === invitation.id}
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
