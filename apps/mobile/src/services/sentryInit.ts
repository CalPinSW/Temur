import * as Sentry from '@sentry/react-native';

// Runs as a side effect of being imported. This must be the very first
// thing index.ts imports, before App (and everything App transitively
// imports) — Sentry.init() living inside App.tsx's own body ran too late:
// ES module imports are fully evaluated before the importing file's own
// statements run, so a throw during App's import chain (e.g. a
// misconfigured env var crashing services/supabase.ts at module load)
// happened before that Sentry.init() call ever executed. That's exactly
// what made a real startup crash completely invisible in Sentry.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  // Only report from real builds (EAS preview/production) — never from
  // Expo Go / a dev client connected to Metro, so local work doesn't eat
  // into the free-tier event quota.
  enabled: !__DEV__,
});
