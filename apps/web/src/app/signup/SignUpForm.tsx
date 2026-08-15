'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { formatUsername } from '@temur/shared';
import { signUp, type SignUpFormState } from './actions';

const initialState: SignUpFormState = {};

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  if (state.success) {
    return (
      <p className="max-w-sm rounded-lg bg-background-secondary px-4 py-3 text-center text-text">
        Check your email to confirm your account, then{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          sign in
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-text-secondary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-text-secondary">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-text-secondary">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          maxLength={30}
          autoComplete="username"
          placeholder="e.g. the_batman"
          onChange={(e) => {
            e.currentTarget.value = formatUsername(e.currentTarget.value);
          }}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
        <p className="text-xs text-text-tertiary">Used by friends to find you</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-text-secondary">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          placeholder="e.g. Bruce Wayne"
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
        {isPending ? 'Signing up…' : 'Sign up'}
      </button>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Sign in
        </Link>
      </p>
    </form>
  );
}
