'use client';

import { useActionState } from 'react';
import { createGroup, type CreateGroupState } from './actions';

const initialState: CreateGroupState = {};

export function CreateGroupForm() {
  const [state, formAction, isPending] = useActionState(createGroup, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-text-secondary">
          Group Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Tuesday Night Football"
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-text-secondary">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="What's this group for?"
          rows={3}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-error-background px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Create Group'}
      </button>
    </form>
  );
}
