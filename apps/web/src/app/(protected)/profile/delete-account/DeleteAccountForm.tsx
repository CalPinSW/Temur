'use client';

import { useActionState, useState } from 'react';
import { deleteAccount, type DeleteAccountState } from './actions';

const initialState: DeleteAccountState = {};

export function DeleteAccountForm({ username, email }: { username: string; email: string }) {
  const [state, formAction, isPending] = useActionState(deleteAccount, initialState);
  const [confirmText, setConfirmText] = useState('');

  const typed = confirmText.trim().toLowerCase();
  const isConfirmed =
    typed.length > 0 && (typed === username.toLowerCase() || typed === email.toLowerCase());

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm('This is permanent. Are you absolutely sure you want to delete your account?')) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-text-secondary">
        Deleting your account is permanent and cannot be undone. This will remove your profile,
        friends, group memberships, game signups, and ratings. Signing up again later — even with
        the same email — starts a brand new account with none of this data.
      </p>
      <p className="text-sm text-text-secondary">
        Games and groups you created will stay for other members, with your name removed. Groups
        you&apos;re the only member of will be deleted along with their games.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-sm font-medium text-text-secondary">
          Type &quot;{username}&quot; or your email to confirm
        </label>
        <input
          id="confirm"
          name="confirm"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
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
        disabled={!isConfirmed || isPending}
        className="rounded-lg bg-error px-4 py-2 font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Deleting…' : 'Permanently Delete Account'}
      </button>
    </form>
  );
}
