import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0,
      // Only report from deployed builds (Vercel preview/production, both
      // built via `next build`) — never from local `next dev`, so local
      // work doesn't eat into the free-tier event quota.
      enabled: process.env.NODE_ENV === 'production',
    });
  }
}

// A client that navigates away or closes the tab mid-stream (e.g. before an
// RSC response finishes) aborts the connection Next.js is writing to. Next's
// own abort detection (`isAbortError`) only recognizes `AbortError`/
// `ResponseAborted`, so this generic one slips through to `onRequestError`
// as if it were a real server failure — it isn't, it's expected client
// behavior. Filtering it here (rather than via Sentry's `ignoreErrors`)
// keeps the check colocated with the one place this error can originate.
// Upstream bug: https://github.com/vercel/next.js/issues/96704
const isClientAbortedStreamError = (error: unknown) =>
  error instanceof Error && error.message === 'The destination stream closed early.';

export const onRequestError: typeof Sentry.captureRequestError = (error, request, context) => {
  if (isClientAbortedStreamError(error)) {
    return;
  }
  return Sentry.captureRequestError(error, request, context);
};
