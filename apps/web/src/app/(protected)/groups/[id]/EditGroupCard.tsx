'use client';

import { useState, useTransition } from 'react';
import { updateGroup } from './actions';

export function EditGroupCard({
  groupId,
  name,
  description,
  messageTemplate,
  isAdmin,
}: {
  groupId: string;
  name: string;
  description: string;
  messageTemplate: string;
  isAdmin: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!isEditing) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-lg font-semibold text-text">{name}</h1>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium text-primary hover:text-primary-hover"
            >
              Edit
            </button>
          )}
        </div>
        {description && <p className="mt-2 text-sm text-text-secondary">{description}</p>}
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const { error } = await updateGroup(groupId, {
        name: String(formData.get('name') ?? ''),
        description: String(formData.get('description') ?? ''),
        messageTemplate: String(formData.get('messageTemplate') ?? ''),
      });
      if (error) {
        setError(error);
        return;
      }
      setIsEditing(false);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-text-secondary">
          Group Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={name}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-text-secondary">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={description}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="messageTemplate" className="text-sm font-medium text-text-secondary">
          Default Team Assignment Message
        </label>
        <textarea
          id="messageTemplate"
          name="messageTemplate"
          rows={2}
          defaultValue={messageTemplate}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
        <p className="text-xs text-text-tertiary">
          Pre-fills the message when an admin notifies players of their team. &quot;You&apos;re on
          {' {team}'}&quot; is always appended automatically.
        </p>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
