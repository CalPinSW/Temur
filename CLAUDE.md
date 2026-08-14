# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Temur (`app.json` name/slug/scheme: `temur`, iOS/Android bundle id `com.calpin.temur`) is a React Native (Expo) mobile app, built from a generic "mobile app template" and now specialized for organizing football/5-a-side games: admins create games, players sign up, admins assign teams (drag-and-drop board), and players rate each other after games. Backend is Supabase (Postgres + Auth + Edge Functions + Storage).

Repo layout:
- `app/` — the Expo React Native app (all frontend work happens here)
- `supabase/` — Postgres migrations, Edge Functions (Deno), and integration tests

## Commands

All app commands run from `app/`:

```bash
npm install                 # install deps
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

Run a single Jest test file: `npx jest src/__tests__/billCalculation.test.ts`. Test files live in `app/src/__tests__/` and match `**/*.test.ts`.

Supabase / backend, run from `supabase/` (requires Docker + local Supabase for integration tests, and Deno):

```bash
supabase start                # start local Supabase stack
deno task test                # run Edge Function integration tests (supabase/tests/)
supabase db push               # push pending migrations to the linked remote project
supabase functions deploy <name>   # deploy one edge function
supabase functions deploy          # deploy all edge functions
```

E2E (Maestro), from `app/`:

```bash
npx expo start --go --ios
maestro test .maestro/
```

Note on `supabase db push` auth bug: if it fails with `permission denied to alter role` / `cli_login_postgres`, work around it with:
```bash
SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_PASSWORD=' app/.env | cut -d '=' -f2-) supabase db push
```
(known open Supabase CLI bug, not fixable by re-login/upgrade — see `README.md`).

## Architecture

### Frontend (`app/src/`)

- `screens/` — one folder per feature area (`auth/`, `home/`, `friends/`, `profile/`, `admin/`, `main/`). Each folder has an `index.ts` barrel export. There is **no `@react-navigation` stack per feature** — most sub-screens (e.g. edit profile, about, friend search) are toggled via local `useState` inside a `*Stack` wrapper component in `MainNavigator.tsx` rather than pushed as navigator routes. Follow this pattern (state-driven view swapping inside a tab's stack component) instead of adding new navigator screens, unless the existing pattern clearly doesn't fit.
- `navigation/` — `RootNavigator` picks `AuthNavigator` vs `MainNavigator` based on `useAuthStore`'s `user`. `MainNavigator` defines the bottom tab bar; `HomeTab` and `AdminTab` are conditionally rendered based on `profile?.is_admin`.
- `store/` — Zustand stores (e.g. `authStore.ts`). `authStore` owns `user`/`session`/`profile` and drives `isInitialized`/`isLoading` gates used by the navigator's splash state. Async Supabase calls in the store are wrapped with a `withTimeout` helper to avoid hanging on flaky mobile connections (notably Android).
- `services/` — thin wrappers around Supabase/native APIs: `supabase.ts` (client + `ExpoSecureStoreAdapter`, which chunks values over 1800 bytes because `expo-secure-store` has a 2048-byte item limit), `socialAuthService.ts` (Google/Apple), `notificationService.ts`, `navigationService.ts` (imperative nav ref for deep-linking from push notifications).
- `components/themed/` — the themed component library (`Button`, `Card`, `Input`, `Badge`, `Dropdown`, etc.), backed by `theme/ThemeContext.tsx` + `theme/colors.ts`. **Prefer these `Themed` components over raw RN primitives** when building UI; if a new primitive is needed, add a themed version first (see `.windsurf/rules/code-quality.md`).
- `components/game/`, `components/team-assignment/` — feature-specific composed components for the games/team-assignment domain (game cards, drag-and-drop player chips/board, team stats).
- `hooks/` — feature hooks that encapsulate Supabase queries + local state for a screen (e.g. `useGameDetails`, `useGameActions`, `useTeamAssignment`, `useNotifications`).
- `types/` — shared TypeScript types (`auth.ts`, `game.ts`) mirroring the DB schema/domain model.
- Path aliases: `@/*` → `src/*` (and `@/components`, `@/screens`, `@/hooks`, `@/services`, `@/store`, `@/types`, `@/utils`), configured in both `tsconfig.json` (paths) and `babel.config.js` (module-resolver) — keep these two in sync when adding new alias roots. Jest maps `@/*` the same way via `moduleNameMapper` in `jest.config.js`.

### Backend (`supabase/`)

- `migrations/` — applied in filename (timestamp) order. Current schema is split across:
  - `20260122000100_initial_schema.sql` — template baseline: `profiles`, `friendships`, avatar storage bucket + cleanup triggers (`cleanup_old_avatar_on_update`, `cleanup_avatar_on_delete`), `handle_new_user()` trigger that creates a profile row on signup.
  - `20260228000000_create_game_relevant_tables.sql` — game domain: `games`, `player_games` (signups/waitlist/team assignment), `player_ratings`.
  - `20260811000000_add_board_position_to_player_games.sql` — incremental addition (drag-and-drop board coordinates on `player_games`).
  - Every table has RLS enabled with explicit `CREATE POLICY` statements — when adding a table, add matching policies in the same migration (viewable-by-authenticated, owner-write, admin-write patterns are established — check `profiles.is_admin` for admin-gated policies).
- `functions/` — Deno Edge Functions, one dir per function with `index.ts`; `_shared/` holds cross-function utilities (e.g. `rate-limit-example.ts`). Functions that need the caller's JWT for internal auth (to call RPCs with user context) are deployed with `--no-verify-jwt` to avoid gateway-level verification stripping the payload — see `README.md` for when this is appropriate.
- `tests/` — Deno integration tests against a running local Supabase instance (`avatar-cleanup.test.ts.skip`, `send-notification.test.ts`).

## Code style

- ESLint (flat config, `eslint.config.js`) + Prettier are enforced (`prettier/prettier: error`). TypeScript strict mode is on.
- Remove dead/unused code you encounter rather than leaving it; proactively flag (or make, if in scope) refactoring opportunities that improve maintainability, even if tangential to the current task.
- Avoid React fragments where a `View` works instead.
- Unused vars/args are only allowed with a `_` prefix (`@typescript-eslint/no-unused-vars`).
- Avoid comments; prefer well-named components, functions, and variables to explain intent. Only add a comment when it's strictly necessary (e.g. a non-obvious workaround, a hidden constraint, or a subtlety that naming can't convey).
- All core functionality (business logic, hooks, services, Edge Functions) should have tests — unit tests under `app/src/__tests__/` or Deno integration tests under `supabase/tests/` as appropriate.
