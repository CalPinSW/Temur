# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Temur (`app.json` name/slug/scheme: `temur`, iOS/Android bundle id `com.calpin.temur`) organizes football/5-a-side games: admins create games, players sign up and get waitlisted, admins assign teams (drag-and-drop board), and players rate each other after games. Backend is Supabase (Postgres + Auth + Edge Functions + Storage), shared by two frontends:

- **`apps/mobile`** — React Native (Expo) app. The original, most-complete client.
- **`apps/web`** — Next.js app (Vercel). Newer, in progress — see `docs/web-feature-parity-plan.md` for what's still missing relative to mobile.

Both apps authenticate against and read/write the same Supabase project.

> **Keep mobile and web in lock-step.** When you build a feature or fix a user-facing bug, implement/fix it in both `apps/mobile` and `apps/web` — or say explicitly why you're skipping one (e.g. it depends on a native-only capability). Check `docs/web-feature-parity-plan.md` before starting web work: it tracks what's built vs. outstanding. Update it when you close a gap or discover a new one.

> **Add E2E coverage for new web features.** When you ship a new user-facing flow in `apps/web`, add a Playwright spec for its happy path under `apps/web/e2e/` (see "Web E2E tests" below) — don't just rely on unit tests or manual clicking. Bug fixes to existing flows don't need a new spec unless the bug was a regression an E2E test would have caught.

> **Redeploy Supabase Edge Functions after merging.** Merging a PR that changes anything under `supabase/functions/` does not make that change live — `supabase functions deploy <name>` (or the equivalent Supabase MCP tool) against the remote project is a separate, manual step. This bit us for real: `send-auth-email`'s logo/centering update merged and sat live-but-not-deployed, so production kept sending the old unbranded email with no error or warning anywhere. Secrets (`supabase secrets set`) apply immediately without a redeploy — it's specifically *code* changes (`index.ts`, `_shared/*.ts`) that need it. After merging, check which functions changed since the last deploy and redeploy them; don't assume merged means live.

## Features

- **Auth** — email/password and Google/Apple social sign-in (mobile only for now, see parity plan); profiles auto-created via `handle_new_user()` DB trigger on signup. Auth errors (wrong password, weak password, email already registered, rate-limited) are mapped to curated, human-readable messages via `getAuthErrorMessage` in `packages/shared` instead of surfacing raw Supabase error text. Password reset is built on both apps now: mobile's `ForgotPasswordScreen` requests the email (`resetPassword()` in `authStore.ts`), and a `temur://reset-password` deep link is picked up by `useAuthDeepLinks` (React Native `Linking`, since the mobile Supabase client has `detectSessionInUrl: false`) which establishes the recovery session and flags `isPasswordRecovery`, causing `RootNavigator` to render `ResetPasswordScreen` in place of the normal Auth/Main split; web's `/forgot-password` requests the email and `/reset-password` completes it, but — unlike every other web auth flow, which goes through `/auth/callback`'s server-side PKCE code exchange — recovery links deliver tokens as a URL hash fragment the server never sees, so `ResetPasswordForm` parses `window.location.hash` and calls the browser client's `setSession()` directly, client-side. On the **remote** project only, the reset-password email (and every other Supabase Auth email type, if ever triggered) is sent through Resend with Temur's own branding via the `send-auth-email` edge function (Supabase Auth's Send Email Hook), instead of Supabase's plain default templates — see `README.md`'s "Auth Emails (Resend)" section. Local dev deliberately isn't wired up to this hook and keeps using Supabase's default local mailer (Inbucket), the same "deployed-only" split used for Sentry.
- **Profile** — avatar upload, display name/username editing, theme (light/dark/system) on mobile, push-notification toggle, sign out. Avatar uploads are validated client-side and server-side against the same limits (`validateAvatarFile`/`MAX_AVATAR_SIZE_BYTES`/`ALLOWED_AVATAR_MIME_TYPES` in `packages/shared`, enforced again at the storage layer via the `avatars` bucket's `file_size_limit`/`allowed_mime_types`); failures are mapped to curated messages via `getAvatarUploadErrorMessage`.
- **Bug reports** — any signed-in user can submit a bug report (description + auto-gathered diagnostic context: platform, app version/build, and the last few uncaught errors captured this session via `recordError`/`getRecentErrors` in `packages/shared`) from Profile → "Report a Bug". The `send-bug-report` edge function persists it to the `bug_reports` table (RLS: own-rows-only) and emails `SUPPORT_EMAIL` via Resend with `reply_to` set to the reporter's email. Global uncaught-error capture feeds the ring buffer: `window.onerror`/`unhandledrejection` on web (`apps/web/src/app/ErrorCapture.tsx`), `ErrorUtils.setGlobalHandler` chained to the previous handler on mobile (`apps/mobile/src/services/errorCaptureService.ts`, initialized once in `App.tsx`).
- **Error monitoring** — Sentry (`@sentry/nextjs` on web, `@sentry/react-native` on mobile; org `softwire-zd`, projects `temur-web`/`temur-mobile`) automatically captures uncaught exceptions and unhandled rejections in both apps — separate from, and complementary to, the bug-report ring buffer above (Sentry is for developer-side monitoring/alerting; bug reports are user-initiated with their own context). Handled errors that only used to reach `console.error` inside a `catch` block are also explicitly forwarded via `Sentry.captureException(error)` at each site, since Sentry's automatic capture only sees uncaught errors. Performance/tracing is intentionally off (`tracesSampleRate: 0`) to stay within Sentry's free tier — this is error tracking only. See the Mobile/Web architecture notes below for the exact wiring and the one-time manual steps (`SENTRY_AUTH_TOKEN`) needed for readable (non-minified) stack traces in production.
- **Uncaught-error recovery** — both apps replace a would-be crash screen with a toast + automatic return to a safe screen, on top of (not instead of) the Sentry capture above. Web's root `app/error.tsx` boundary catches any uncaught exception from rendering or a Server Action, shows a toast (`ToastProvider`/`useToast`), and redirects via `getBackHref(pathname)` (the same "go up one path segment" helper the header back button uses). Mobile's class-based `ErrorBoundary` (wrapping `RootNavigator` in `App.tsx`) catches uncaught render exceptions, shows a toast via a small module-singleton (`toastService.ts`/`ToastHost` — a plain pub-sub rather than React context, since the class boundary's lifecycle methods can't use hooks), and auto-resets itself after ~800ms, which remounts the navigator tree fresh. Neither boundary catches errors from plain async/event-handler code (only render-phase exceptions, or — on web — Server Actions specifically, since React dispatches those as transitions); Supabase call failures continue to be handled via returned `{ error }` values and curated messages, not by these boundaries.
- **Friends** — search users, send/accept/decline friend requests, remove friends.
- **Groups** — create a group, invite players, promote/demote members, view a group's upcoming games; group admins can create games scoped to the group. Any group admin (not creator-only, unlike the game equivalent below) can soft-delete a group via the `delete_group` RPC — `groups.deleted_at`, same "disappears from every read, for everyone, no recovery UI" behavior as game soft-delete, and it also soft-deletes every game scoped to that group in the same call. The deleted check lives in `is_group_member`/`is_group_admin` themselves (not just the `groups` table's own SELECT policy), so every other policy built on top of them — game creation, invitations, member management — automatically stops treating a deleted group's members as members with no per-policy changes needed.
- **Games** — create a game (friends-invite mode or group mode), set kickoff time / "visible from" time / team names / players-per-team; players sign up and get waitlisted once capacity (`players_per_team * 2`) is exceeded; withdraw; admins can add/remove guest "ringers", invite more friends, and notify players of team assignments. The creator (specifically — not any group admin) can soft-delete a game (`deleted_at`, via the `delete_game` RPC); once deleted it disappears from every read, for everyone, with no recovery UI. On the games list screen, a game not yet visible to everyone (before `visible_at`) still shows to its admin/creator as an early preview, greyed out and non-clickable (`getGameVisibilityStatus` in `packages/shared`) — distinct from being fully open, which only happens once `visible_at` passes.
- **Team assignment board** — admin-only drag-and-drop board (mobile: `PanResponder`/`Animated`) that assigns players to teams and persists board position; also a simpler list-based assignment mode.
- **Results & ratings** — admins enter a final score or win/draw/loss outcome (`set_game_result` RPC); players who played rate each other 1–10 afterward (own ratings given are private; `get_player_rating_summary` RPC returns aggregates).
- **Notifications** — push notifications (mobile only, Expo push, requires a physical device) for friend requests, group/game invites, team assignments, ringers-opened, and new-game-visible (via a `pg_cron`-triggered edge function sweep); in-app badge counts on Friends/Groups tabs via realtime subscriptions (both apps); email for the same events (via Resend, `supabase/functions/_shared/email.ts`) as web's out-of-band channel since it has no push registration — sent independently of push, so mobile users get both and web-only users still get notified.
- **Admin model** — no global "admin" role or dedicated admin tab. A user is a game's admin if they created it or are an admin of its group (`isGameAdmin` in `packages/shared`); a user is a group's admin per `group_members.role`.

## Repo layout

npm workspaces monorepo:

```
apps/
  mobile/    — Expo React Native app
  web/       — Next.js app (Vercel)
packages/
  shared/    — @temur/shared: framework-free TS shared by both apps
supabase/    — Postgres migrations, Edge Functions (Deno), integration tests
docs/        — web-feature-parity-plan.md and other cross-cutting docs
```

`packages/shared` holds only code with zero React Native/Expo/Next dependencies: domain types (`types/game.ts`, `types/auth.ts`, mirroring the DB schema) and pure business-logic utilities (`utils/gameUtils.ts` — capacity/waitlist/signup-order/admin-check logic; `utils/validation.ts` — username validation + avatar file validation; `utils/errorMessages.ts` — maps raw Supabase Auth/Storage error shapes to curated human-readable messages; `utils/errorCapture.ts` — a bounded in-memory ring buffer of recent uncaught errors, fed by each app's platform-specific global error hook, for attaching to bug reports). It has **no build step** — it's consumed as TS source directly, so Metro (`apps/mobile/metro.config.js` sets up monorepo `watchFolders`/`nodeModulesPaths`) and Next (`apps/web/next.config.ts`'s `transpilePackages`) each transpile it themselves. When you find more RN/Next-free logic duplicated (or about to be duplicated) between the two apps, move it here instead.

**Root `package.json` pins `react`/`react-dom` to `19.1.0` via `overrides`** — the exact version `apps/mobile`'s Expo SDK/React Native pairing requires (validated by `npx expo install --check`). `apps/web` declares the same version rather than its own newer one on purpose: without the override, npm workspaces hoists one React version to root and nests a second, different one inside whichever workspace's pin doesn't match — and having two React copies in a single running app is a real, hard-to-diagnose crash, not just a size/perf concern. Hit this for real: an EAS `preview` build of mobile compiled and installed fine but crashed on every launch with `TypeError: Cannot read property 'useContext' of null` inside `react-native-safe-area-context`, because mobile's dependency tree had silently split across a root-hoisted `react@19.2.8` (web's pin) and a nested `apps/mobile/node_modules/react@19.1.0`. If you ever need to bump either app's React version, bump both together (root `overrides` + both `apps/*/package.json`), then verify with `find . -path "*/node_modules/react/package.json"` (ignoring `@expo/cli`'s own bundled copy) that only one copy exists — a plain `npm install` on top of an existing lockfile doesn't reliably re-resolve an `overrides` change; delete `node_modules`/`package-lock.json` and reinstall clean if `find` still shows two.

## Commands

### Mobile (`apps/mobile`)

Run via `npm run <script> -w apps/mobile` from the repo root, or `cd apps/mobile` first:

```bash
npm install                 # install deps (prefer `npm install` from repo root — single workspace lockfile)
npx expo start              # start Metro/dev server
npm run ios                 # expo run:ios
npm run android              # expo run:android
npm run build:ios:dev       # eas build --platform ios --profile development (remote EAS dev-client build)
npm run lint                # eslint .
npm run lint:fix
npm run format               # prettier --write "**/*.{ts,tsx,js,json}"
npm test                     # jest (unit tests)
npm run test:watch
npm run test:coverage
```

Run a single Jest test file: `npx jest src/__tests__/gameUtils.test.ts` from `apps/mobile/`. Test files live in `apps/mobile/src/__tests__/` and match `**/*.test.ts`.

E2E (Maestro), from `apps/mobile/`:

```bash
npx expo start --go --ios
maestro test .maestro/
```

### Web (`apps/web`)

```bash
npm run dev -w apps/web      # next dev
npm run build -w apps/web    # next build
npm run lint -w apps/web     # eslint
npm test -w apps/web         # jest (unit tests for pure logic, e.g. team-assignment state/geometry)
npm run test:e2e -w apps/web # playwright (see "Web E2E tests" below)
```

Needs `apps/web/.env.local` (copy from `.env.local.example`) pointing at the **same** Supabase project as mobile's `apps/mobile/.env`.

#### Web E2E tests

Playwright specs live in `apps/web/e2e/`. They run against the **local** Supabase stack only — never the shared remote project — because global setup creates and deletes real auth users. Before running them:

```bash
supabase start                                          # from repo root
```

Then point `apps/web/.env.local` at the local stack (`supabase status -o json` prints the URL/publishable key) instead of the remote project, and run `npm run test:e2e -w apps/web`. `e2e/global-setup.ts` creates two deterministic test accounts (`E2E_USERS.primary`/`secondary` in `e2e/global-setup.ts`) directly via the Supabase Admin API, signs each in through the real UI once, and saves per-user `storageState` for specs to reuse (`test.use({ storageState: primaryStorageState })`, from `e2e/helpers.ts`). Specs run fully serially (`workers: 1`) since they share those two accounts and mutate overlapping state — don't parallelize without rethinking that.

### Shared package (`packages/shared`)

```bash
npm test -w packages/shared
npm run lint -w packages/shared
```

### Supabase / backend (`supabase/`)

Requires Docker + local Supabase for integration tests, and Deno:

```bash
supabase start                # start local Supabase stack
deno task test                # run Edge Function integration tests (supabase/tests/)
supabase db push               # push pending migrations to the linked remote project
supabase functions deploy <name>   # deploy one edge function
supabase functions deploy          # deploy all edge functions
```

Note on `supabase db push` auth bug: if it fails with `permission denied to alter role` / `cli_login_postgres`, work around it with:
```bash
SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_PASSWORD=' apps/mobile/.env | cut -d '=' -f2-) supabase db push
```
(known open Supabase CLI bug, not fixable by re-login/upgrade — see `README.md`).

## Architecture

### Mobile (`apps/mobile/src/`)

- `screens/` — one folder per feature area (`auth/`, `home/`, `friends/`, `groups/`, `profile/`, `main/`). Each folder has an `index.ts` barrel export. `home/` is a dev-only theme/component showcase, gated behind `__DEV__` in `MainNavigator` — not user-facing. There is **no `@react-navigation` stack per feature** — most sub-screens (e.g. edit profile, about, friend search, group detail) are toggled via local `useState` inside a `*Stack` wrapper component in `MainNavigator.tsx` rather than pushed as navigator routes. Follow this pattern (state-driven view swapping inside a tab's stack component) instead of adding new navigator screens, unless the existing pattern clearly doesn't fit.
- `navigation/` — `RootNavigator` picks `AuthNavigator` vs `MainNavigator` based on `useAuthStore`'s `user`. `MainNavigator` defines the bottom tab bar: Games, Friends, Groups, Profile (plus dev-only Home). There is no global admin tab — admin UI is conditional within Games/Groups screens (see Admin model above).
- `store/` — Zustand stores (e.g. `authStore.ts`). `authStore` owns `user`/`session`/`profile` and drives `isInitialized`/`isLoading` gates used by the navigator's splash state. Async Supabase calls in the store are wrapped with a `withTimeout` helper to avoid hanging on flaky mobile connections (notably Android).
- `services/` — thin wrappers around Supabase/native APIs: `supabase.ts` (client + `ExpoSecureStoreAdapter`, which chunks values over 1800 bytes because `expo-secure-store` has a 2048-byte item limit), `socialAuthService.ts` (Google/Apple), `notificationService.ts`, `navigationService.ts` (imperative nav ref for deep-linking from push notifications).
- `components/themed/` — the themed component library (`Button`, `Card`, `Input`, `Badge`, `Dropdown`, etc.), backed by `theme/ThemeContext.tsx` + `theme/colors.ts`. **Prefer these `Themed` components over raw RN primitives** when building UI; if a new primitive is needed, add a themed version first (see `.windsurf/rules/code-quality.md`).
- `components/game/`, `components/team-assignment/` — feature-specific composed components for the games/team-assignment domain (game cards, drag-and-drop player chips/board, team stats).
- `hooks/` — feature hooks that encapsulate Supabase queries + local state for a screen (e.g. `useGameDetails`, `useGameActions`, `useTeamAssignment`, `useNotifications`).
- `types/` — mobile-only types (e.g. `group.ts`, `images.d.ts`); domain types shared with web live in `packages/shared` instead — import them as `@temur/shared`, not `@/types/game`.
- Path aliases: `@/*` → `src/*` (and `@/components`, `@/screens`, `@/hooks`, `@/services`, `@/store`, `@/types`), configured in both `tsconfig.json` (paths) and `babel.config.js` (module-resolver) — keep these two in sync when adding new alias roots. Jest maps `@/*` the same way via `moduleNameMapper` in `jest.config.js`. `@temur/shared` is a real workspace package (not a path alias) — no alias entry needed for it.
- `Sentry.init({ dsn: EXPO_PUBLIC_SENTRY_DSN, tracesSampleRate: 0 })` lives in `src/services/sentryInit.ts`, imported for its side effect as the very first statement in `index.ts` — before `App` (and everything `App` transitively imports, including `services/supabase.ts`, which throws at module-load time if Supabase env vars are missing). This isn't cosmetic: it used to live inline in `App.tsx`'s own body, which ran *after* all of `App.tsx`'s imports were fully evaluated — so a throw anywhere in that import chain (exactly what happened when an EAS build's environment was missing `EXPO_PUBLIC_SUPABASE_URL`) crashed the app before Sentry had ever initialized, with zero visibility into why. `App.tsx` still calls `initErrorCapture()` right after its own imports (Sentry is already initialized by then) so `initErrorCapture()`'s own `ErrorUtils.getGlobalHandler()` chains onto the handler Sentry installed (itself chained to the original), preserving all three: our ring buffer, Sentry telemetry, and RN's own dev-mode error overlay. The exported `App` component is wrapped with `Sentry.wrap(App)`. The `@sentry/react-native/expo` config plugin (`app.json`'s `plugins`) needs `SENTRY_AUTH_TOKEN` as an EAS secret to upload source maps on build — without it the build still succeeds, but Sentry shows minified stack traces. **Monorepo gotcha**: npm hoists `@sentry/react-native` to the repo root `node_modules`, but `expo` only ever installs inside `apps/mobile/node_modules` (never hoisted) — the Expo config plugin's own `require('expo/config-plugins')` then can't resolve, since Node's resolution walk from the hoisted plugin file never reaches `apps/mobile/node_modules`, and a symlink doesn't fix it either (Node resolves symlinks to their real path before walking up). `apps/mobile/scripts/fix-sentry-expo-plugin-resolution.js`, wired as `postinstall`, keeps a real (non-symlinked) local copy in sync after every `npm install`. **EAS Environments gotcha**: `eas build` reads env vars from EAS's own per-environment store (`eas env:list --environment <name>`), completely separate from the local `apps/mobile/.env` file `expo start`/`expo run:ios` use — a build can compile and upload fine while still crashing instantly on-device because that store is missing an `EXPO_PUBLIC_*` var `.env` has. Check `eas env:list` for each environment (`development`/`preview`/`production`) before assuming a build's runtime config matches local.

### Web (`apps/web/src/`)

- App Router, Server Components + Server Actions by default — most pages fetch data directly in a server component and mutate via a co-located `actions.ts` (`'use server'`), rather than client-side fetching. Reach for a client component only for actual interactivity (forms using `useActionState`, buttons).
- `lib/supabase/client.ts` / `server.ts` — `@supabase/ssr` browser/server client factories (cookie-based session storage, the web equivalent of mobile's `ExpoSecureStoreAdapter`-backed client). `server.ts` also exports `getUser()`, wrapped in React's `cache()` so a layout and its page don't each pay for a separate auth round trip in the same request.
- `middleware.ts` + `lib/supabase/middleware.ts` — refreshes the auth session cookie on every request; required for Server Components downstream to see a valid session.
- `app/(protected)/` — route group requiring auth; its `layout.tsx` redirects to `/login` if there's no session and renders the shared nav/sign-out. Pages needing a signed-in user go under here.
- `app/login`, `app/signup`, `app/auth/callback` — auth flow (email/password only so far; social sign-in is mobile-only, see parity plan).
- Uses Next 16's typed routes (`PageProps<'/route'>`, `LayoutProps<'/route'>` globals, generated from the actual `app/` folder structure) — use these instead of hand-writing param types.
- Tailwind v4 (CSS-first config in `app/globals.css`); the `@theme` color tokens mirror `apps/mobile/src/theme/colors.ts` so the two apps read as the same product, without sharing actual styling code (RN styles and CSS aren't shareable).
- `instrumentation.ts` / `instrumentation-client.ts` (project root, alongside `middleware.ts` — not under `src/`, per this Next version's convention) call `Sentry.init({ dsn: NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0 })` for server/edge and client respectively; `app/global-error.tsx` reports React render errors the App Router's own error boundary would otherwise swallow from Sentry's view. `next.config.ts`'s `withSentryConfig` needs `SENTRY_AUTH_TOKEN` (Vercel env var) to upload source maps at build time — without it the build still succeeds (`silent: true`), but Sentry shows minified stack traces.

### Backend (`supabase/`)

- `migrations/` — applied in filename (timestamp) order. Current schema is split across:
  - `20260122000100_initial_schema.sql` — template baseline: `profiles`, `friendships`, avatar storage bucket + cleanup triggers (`cleanup_old_avatar_on_update`, `cleanup_avatar_on_delete`), `handle_new_user()` trigger that creates a profile row on signup.
  - `20260228000000_create_game_relevant_tables.sql` — game domain: `games`, `player_games` (signups/waitlist/team assignment), `player_ratings`.
  - `20260811000000_add_board_position_to_player_games.sql` — incremental addition (drag-and-drop board coordinates on `player_games`).
  - Later migrations add `groups`/`group_members`/`group_invitations`/`game_invitations` (group + invite scoping of game visibility), notification sweep infra (`visibility_notified_at` + `pg_cron`), ringers (`saved_ringers`, `is_ringer`/`guest_name` on `player_games`), game results (`result_team1_score`/`result_team2_score`/`result_outcome` + `set_game_result` RPC), game soft-delete (`games.deleted_at` + `delete_game` RPC, creator-only — deliberately narrower than `is_game_admin`, which also covers any group admin; `can_view_game` excludes soft-deleted rows for everyone), `avatars` bucket size/mime restrictions (`file_size_limit`, `allowed_mime_types`, backstopping the client-side `validateAvatarFile` check), `bug_reports` (RLS: own-rows SELECT + INSERT, though the actual insert path goes through the `send-bug-report` edge function's service-role client), and group soft-delete (`groups.deleted_at` + `delete_group` RPC, any group admin — matches `is_group_admin` exactly, unlike `delete_game`'s narrower creator-only check — which also soft-deletes every game scoped to that group; the deleted check is baked into `is_group_member`/`is_group_admin` themselves rather than only the `groups` table's SELECT policy).
  - Every table has RLS enabled with explicit `CREATE POLICY` statements — when adding a table, add matching policies in the same migration (viewable-by-authenticated, owner-write, admin-write patterns are established).
- `functions/` — Deno Edge Functions, one dir per function with `index.ts`; `_shared/` holds cross-function utilities (`email.ts` — Resend, including `buildBugReportEmail`, `buildAuthEmail`, and an optional `replyTo` param on `sendEmail`). `send-notification` sends push (Expo, mobile) and email (Resend, both apps — web's only channel, no push registration) as two independent delivery paths, neither gating the other. `send-bug-report` persists a report to `bug_reports` then emails `SUPPORT_EMAIL` with `reply_to` set to the reporter's email. `sweep-visible-games` is cron-triggered via a shared secret (not user JWT), deployed with `--no-verify-jwt` — see `README.md` for when that flag is appropriate; it sends the same two channels directly (doesn't call `send-notification`). `send-auth-email` is Supabase Auth's Send Email Hook target — like `sweep-visible-games` it has no user JWT (`verify_jwt = false` in `config.toml`), but authenticates the caller via a Standard Webhooks signature (`SEND_EMAIL_HOOK_SECRET`) instead of a shared header secret; it replaces Supabase's built-in auth email sending with a Resend-backed, branded version, and is only registered on the remote project (via the dashboard), never in local `config.toml` — see README.
  - A custom secret an edge function reads via `Deno.env.get(...)` (e.g. `EDGE_FUNCTION_SECRET`, `RESEND_API_KEY`) needs **two** places updated to reach the *local* function runtime — adding it to `supabase/.env` alone is not enough: it also needs a line in `config.toml`'s `[edge_runtime.secrets]` (`KEY = "env(KEY)"`) forwarding it through. Remote deployment only needs `supabase secrets set`.
- `tests/` — Deno integration tests against a running local Supabase instance.

## Code style

- ESLint (flat config, `eslint.config.js` per workspace) + Prettier are enforced (`prettier/prettier: error`). TypeScript strict mode is on everywhere.
- Remove dead/unused code you encounter rather than leaving it; proactively flag (or make, if in scope) refactoring opportunities that improve maintainability, even if tangential to the current task.
- In `apps/mobile`: avoid React fragments where a `View` works instead; prefer `Themed` components (see above).
- Unused vars/args are only allowed with a `_` prefix (`@typescript-eslint/no-unused-vars`).
- Avoid comments; prefer well-named components, functions, and variables to explain intent. Only add a comment when it's strictly necessary (e.g. a non-obvious workaround, a hidden constraint, or a subtlety that naming can't convey).
- All core functionality (business logic, hooks, services, Server Actions, Edge Functions) should have tests — unit tests under `apps/mobile/src/__tests__/`, `packages/shared/src/__tests__/`, or Deno integration tests under `supabase/tests/` as appropriate.
- In `apps/mobile`, a `catch` block that logs via `console.error` should also call `Sentry.captureException(error)` (the actual caught error object, not a derived string/expression) — `console.error` alone never reaches Sentry, since Sentry only auto-captures *uncaught* errors. `apps/web`'s Server Actions mostly don't have this pattern (`{ data, error }` checks instead of try/catch), so this convention is mobile-specific for now.
