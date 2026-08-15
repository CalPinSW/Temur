# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Temur (`app.json` name/slug/scheme: `temur`, iOS/Android bundle id `com.calpin.temur`) organizes football/5-a-side games: admins create games, players sign up and get waitlisted, admins assign teams (drag-and-drop board), and players rate each other after games. Backend is Supabase (Postgres + Auth + Edge Functions + Storage), shared by two frontends:

- **`apps/mobile`** — React Native (Expo) app. The original, most-complete client.
- **`apps/web`** — Next.js app (Vercel). Newer, in progress — see `docs/web-feature-parity-plan.md` for what's still missing relative to mobile.

Both apps authenticate against and read/write the same Supabase project.

> **Keep mobile and web in lock-step.** When you build a feature or fix a user-facing bug, implement/fix it in both `apps/mobile` and `apps/web` — or say explicitly why you're skipping one (e.g. it depends on a native-only capability). Check `docs/web-feature-parity-plan.md` before starting web work: it tracks what's built vs. outstanding. Update it when you close a gap or discover a new one.

> **Add E2E coverage for new web features.** When you ship a new user-facing flow in `apps/web`, add a Playwright spec for its happy path under `apps/web/e2e/` (see "Web E2E tests" below) — don't just rely on unit tests or manual clicking. Bug fixes to existing flows don't need a new spec unless the bug was a regression an E2E test would have caught.

## Features

- **Auth** — email/password and Google/Apple social sign-in (mobile only for now, see parity plan); profiles auto-created via `handle_new_user()` DB trigger on signup.
- **Profile** — avatar upload, display name/username editing, theme (light/dark/system) on mobile, push-notification toggle, sign out.
- **Friends** — search users, send/accept/decline friend requests, remove friends.
- **Groups** — create a group, invite players, promote/demote members, view a group's upcoming games; group admins can create games scoped to the group.
- **Games** — create a game (friends-invite mode or group mode), set kickoff time / "visible from" time / team names / players-per-team; players sign up and get waitlisted once capacity (`players_per_team * 2`) is exceeded; withdraw; admins can add/remove guest "ringers", invite more friends, and notify players of team assignments.
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

`packages/shared` holds only code with zero React Native/Expo/Next dependencies: domain types (`types/game.ts`, `types/auth.ts`, mirroring the DB schema) and pure business-logic utilities (`utils/gameUtils.ts` — capacity/waitlist/signup-order/admin-check logic; `utils/validation.ts` — username validation). It has **no build step** — it's consumed as TS source directly, so Metro (`apps/mobile/metro.config.js` sets up monorepo `watchFolders`/`nodeModulesPaths`) and Next (`apps/web/next.config.ts`'s `transpilePackages`) each transpile it themselves. When you find more RN/Next-free logic duplicated (or about to be duplicated) between the two apps, move it here instead.

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

### Web (`apps/web/src/`)

- App Router, Server Components + Server Actions by default — most pages fetch data directly in a server component and mutate via a co-located `actions.ts` (`'use server'`), rather than client-side fetching. Reach for a client component only for actual interactivity (forms using `useActionState`, buttons).
- `lib/supabase/client.ts` / `server.ts` — `@supabase/ssr` browser/server client factories (cookie-based session storage, the web equivalent of mobile's `ExpoSecureStoreAdapter`-backed client). `server.ts` also exports `getUser()`, wrapped in React's `cache()` so a layout and its page don't each pay for a separate auth round trip in the same request.
- `middleware.ts` + `lib/supabase/middleware.ts` — refreshes the auth session cookie on every request; required for Server Components downstream to see a valid session.
- `app/(protected)/` — route group requiring auth; its `layout.tsx` redirects to `/login` if there's no session and renders the shared nav/sign-out. Pages needing a signed-in user go under here.
- `app/login`, `app/signup`, `app/auth/callback` — auth flow (email/password only so far; social sign-in is mobile-only, see parity plan).
- Uses Next 16's typed routes (`PageProps<'/route'>`, `LayoutProps<'/route'>` globals, generated from the actual `app/` folder structure) — use these instead of hand-writing param types.
- Tailwind v4 (CSS-first config in `app/globals.css`); the `@theme` color tokens mirror `apps/mobile/src/theme/colors.ts` so the two apps read as the same product, without sharing actual styling code (RN styles and CSS aren't shareable).

### Backend (`supabase/`)

- `migrations/` — applied in filename (timestamp) order. Current schema is split across:
  - `20260122000100_initial_schema.sql` — template baseline: `profiles`, `friendships`, avatar storage bucket + cleanup triggers (`cleanup_old_avatar_on_update`, `cleanup_avatar_on_delete`), `handle_new_user()` trigger that creates a profile row on signup.
  - `20260228000000_create_game_relevant_tables.sql` — game domain: `games`, `player_games` (signups/waitlist/team assignment), `player_ratings`.
  - `20260811000000_add_board_position_to_player_games.sql` — incremental addition (drag-and-drop board coordinates on `player_games`).
  - Later migrations add `groups`/`group_members`/`group_invitations`/`game_invitations` (group + invite scoping of game visibility), notification sweep infra (`visibility_notified_at` + `pg_cron`), ringers (`saved_ringers`, `is_ringer`/`guest_name` on `player_games`), and game results (`result_team1_score`/`result_team2_score`/`result_outcome` + `set_game_result` RPC).
  - Every table has RLS enabled with explicit `CREATE POLICY` statements — when adding a table, add matching policies in the same migration (viewable-by-authenticated, owner-write, admin-write patterns are established).
- `functions/` — Deno Edge Functions, one dir per function with `index.ts`; `_shared/` holds cross-function utilities. `send-notification` sends Expo push notifications (mobile-only; no-op for users without a push token — relevant once web has its own notification story). `sweep-visible-games` is cron-triggered via a shared secret (not user JWT), deployed with `--no-verify-jwt` — see `README.md` for when that flag is appropriate.
- `tests/` — Deno integration tests against a running local Supabase instance.

## Code style

- ESLint (flat config, `eslint.config.js` per workspace) + Prettier are enforced (`prettier/prettier: error`). TypeScript strict mode is on everywhere.
- Remove dead/unused code you encounter rather than leaving it; proactively flag (or make, if in scope) refactoring opportunities that improve maintainability, even if tangential to the current task.
- In `apps/mobile`: avoid React fragments where a `View` works instead; prefer `Themed` components (see above).
- Unused vars/args are only allowed with a `_` prefix (`@typescript-eslint/no-unused-vars`).
- Avoid comments; prefer well-named components, functions, and variables to explain intent. Only add a comment when it's strictly necessary (e.g. a non-obvious workaround, a hidden constraint, or a subtlety that naming can't convey).
- All core functionality (business logic, hooks, services, Server Actions, Edge Functions) should have tests — unit tests under `apps/mobile/src/__tests__/`, `packages/shared/src/__tests__/`, or Deno integration tests under `supabase/tests/` as appropriate.
