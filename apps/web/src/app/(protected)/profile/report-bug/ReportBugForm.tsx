'use client';

import { useActionState } from 'react';
import { getRecentErrors } from '@temur/shared';
import { submitBugReport, type ReportBugState } from './actions';

const initialState: ReportBugState = {};

export function ReportBugForm({ appVersion, buildSha }: { appVersion: string; buildSha?: string }) {
  const [state, formAction, isPending] = useActionState(submitBugReport, initialState);

  if (state.success) {
    return (
      <p className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
        Thanks — your report has been sent to support.
      </p>
    );
  }

  const context = {
    platform: 'web',
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    appVersion,
    buildSha,
    recentErrors: getRecentErrors(),
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-text-secondary">
          What happened?
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          placeholder="What were you trying to do, and what went wrong?"
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <input type="hidden" name="context" value={JSON.stringify(context)} />

      <p className="text-xs text-text-tertiary">
        We’ll also include your account, app version, and any recent errors from this session to
        help track down the issue.
      </p>

      {state.error && (
        <p className="rounded-lg bg-error-background px-3 py-2 text-sm text-error">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Sending…' : 'Send Report'}
      </button>
    </form>
  );
}
