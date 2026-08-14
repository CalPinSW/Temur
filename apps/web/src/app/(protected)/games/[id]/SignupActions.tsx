'use client';

import { useActionState } from 'react';
import { signUpForGame, withdrawFromGame, type GameActionState } from './actions';

const initialState: GameActionState = {};

export function SignupActions({ gameId, isSignedUp }: { gameId: string; isSignedUp: boolean }) {
  const [signUpState, signUpAction, signUpPending] = useActionState(signUpForGame, initialState);
  const [withdrawState, withdrawActionFn, withdrawPending] = useActionState(
    withdrawFromGame,
    initialState
  );

  const error = signUpState.error ?? withdrawState.error;

  return (
    <div className="flex flex-col gap-2">
      {isSignedUp ? (
        <form action={withdrawActionFn}>
          <input type="hidden" name="gameId" value={gameId} />
          <button
            type="submit"
            disabled={withdrawPending}
            className="rounded-lg border border-error px-4 py-2 font-medium text-error transition-colors hover:bg-error-background disabled:opacity-60"
          >
            {withdrawPending ? 'Withdrawing…' : 'Withdraw'}
          </button>
        </form>
      ) : (
        <form action={signUpAction}>
          <input type="hidden" name="gameId" value={gameId} />
          <button
            type="submit"
            disabled={signUpPending}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {signUpPending ? 'Signing up…' : 'Sign up'}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
