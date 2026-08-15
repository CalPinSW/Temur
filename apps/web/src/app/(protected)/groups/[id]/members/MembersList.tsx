'use client';

import { useState, useTransition } from 'react';
import { getInitials, type GroupMemberWithProfile } from '@temur/shared';
import { updateMemberRole, removeMember } from './actions';

export function MembersList({
  groupId,
  groupName,
  currentUserId,
  isAdmin,
  initialMembers,
}: {
  groupId: string;
  groupName: string;
  currentUserId: string;
  isAdmin: boolean;
  initialMembers: GroupMemberWithProfile[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const filtered = members.filter((member) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      member.profile.username?.toLowerCase().includes(q) ||
      member.profile.display_name?.toLowerCase().includes(q)
    );
  });

  const handleToggleRole = (member: GroupMemberWithProfile) => {
    const nextRole = member.role === 'admin' ? 'member' : 'admin';
    startTransition(async () => {
      const { error } = await updateMemberRole(groupId, member.id, nextRole);
      if (error) {
        window.alert(error);
        return;
      }
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m)));
    });
  };

  const handleRemove = (member: GroupMemberWithProfile) => {
    const memberName = member.profile.display_name || member.profile.username;
    if (!window.confirm(`Remove ${memberName} from ${groupName}?`)) return;

    startTransition(async () => {
      const { error } = await removeMember(groupId, member.id, member.user_id);
      if (error) {
        window.alert(error);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by username or name..."
        autoComplete="off"
        className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
      />

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-text-secondary">No members found</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border bg-card">
          {filtered.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 px-4 py-3 ${isCurrentUser ? 'bg-background-secondary' : ''}`}
              >
                {member.profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
                  <img
                    src={member.profile.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {getInitials(member.profile.display_name, member.profile.username)}
                  </div>
                )}
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">
                      {member.profile.display_name || member.profile.username}
                    </span>
                    {isCurrentUser && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-text-secondary">@{member.profile.username}</span>
                </div>
                {member.role === 'admin' && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Admin
                  </span>
                )}
                {isAdmin && !isCurrentUser && (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleRole(member)}
                      disabled={isPending}
                      className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-background-secondary disabled:opacity-60"
                    >
                      {member.role === 'admin' ? 'Demote' : 'Promote'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(member)}
                      disabled={isPending}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-error hover:opacity-80 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
