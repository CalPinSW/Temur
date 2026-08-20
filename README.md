# Temur

Organize 5-a-side / football games with friends and groups: create games, sign up and get waitlisted, admins assign teams via a drag-and-drop board, and players rate each other afterward.

Two frontends share one Supabase backend:

- **`apps/mobile`** — React Native (Expo) app. The original, most-complete client.
- **`apps/web`** — Next.js app (Vercel). Newer, in progress — see [`docs/web-feature-parity-plan.md`](./docs/web-feature-parity-plan.md) for what's still missing relative to mobile.

See [`CLAUDE.md`](./CLAUDE.md) for the full feature list and architecture notes.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile App** | React Native (Expo) |
| **Web App** | Next.js (Vercel) |
| **Shared logic** | `packages/shared` — framework-free TS (types + business logic) |
| **Backend** | Supabase Edge Functions |
| **Database** | Supabase PostgreSQL |
| **Auth** | Supabase Auth |
| **Real-time** | Supabase Realtime (WebSockets) — both apps; web currently limited to Friends/Groups nav badge counts |

## Project Structure

```
apps/
  mobile/                  # React Native app (Expo)
    src/
      components/          # Reusable UI components
      screens/              # App screens
      hooks/                # Custom React hooks
      services/             # API and native service calls
      store/                 # State management (Zustand)
      types/                 # Mobile-only TypeScript types
  web/                      # Next.js app (Vercel)
    src/
      app/                   # App Router routes, layouts, Server Actions
      lib/                    # Supabase client/server helpers
packages/
  shared/                   # @temur/shared — types + pure business logic, used by both apps
supabase/
  functions/                 # Edge Functions
  migrations/                 # Database migrations
  config.toml
docs/                        # Cross-cutting docs (e.g. web-feature-parity-plan.md)
```

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- Expo CLI (for mobile)
- Supabase CLI (`npm install -g supabase`)
- iOS Simulator (Mac) or Android Emulator (for mobile)

### Installation

```bash
git clone https://github.com/CalPinSW/Temur.git
cd Temur

# Install all workspaces (mobile, web, shared) from the root
npm install
```

### Run the mobile app

```bash
npm run dev:mobile
# or: cd apps/mobile && npx expo start
```

### Run the web app

```bash
npm run dev:web
# or: cd apps/web && npm run dev
```

### Environment Setup

Both apps point at the **same** Supabase project.

```bash
# apps/mobile/.env
cp apps/mobile/.env.example apps/mobile/.env
# fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# apps/web/.env.local
cp apps/web/.env.local.example apps/web/.env.local
# fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (same values as above)

# supabase/.env
cp supabase/.env.example supabase/.env
```

> **Note:** We use the new `sb_publishable_` key format instead of the legacy `anon` key. See [Supabase API Keys documentation](https://supabase.com/docs/guides/api/api-keys) for details.

### First-Time Setup: Connect to a New Supabase Project

1. **Create a Supabase project**
   - Go to the [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project and wait for provisioning
   - Copy the **Project URL** and **Publishable key** from **Settings → API Keys**

2. **Configure environment variables** for both apps (see above).

3. **Login and link CLI to your remote Supabase project**

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

   You can find `<your-project-ref>` in your project URL, e.g. `https://<project-ref>.supabase.co`.

4. **Push migrations to your new project**

   ```bash
   supabase db push
   ```

5. **(Optional) Deploy Edge Functions**

   ```bash
   supabase functions deploy
   ```

   If you want email notifications working, also set the Resend secrets — see "Email Notifications Setup" below.

6. **Run the apps** — see "Run the mobile app" / "Run the web app" above.

#### Authentication Redirect Setup

Configure redirect URLs in **Supabase Dashboard → Authentication → URL Configuration** (mirrors `supabase/config.toml`'s local settings — keep both in sync):

- **Mobile** (deep link, custom scheme `temur`):
  - `temur://auth/callback` (dev builds / production)
  - `temur://reset-password` (forgot-password flow — handled client-side via `useAuthDeepLinks`, not routed through `auth/callback`)
  - `exp://YOUR_LOCAL_IP:8081/--/auth/callback` (Expo Go development — replace `YOUR_LOCAL_IP` with your machine's local IP)
- **Web**:
  - `http://localhost:3000/auth/callback` (local dev)
  - `http://localhost:3000/reset-password` (forgot-password flow — recovery links deliver tokens as a URL hash fragment rather than a `?code=` param, so this bypasses `/auth/callback`'s server-side exchange entirely and is handled client-side in `ResetPasswordForm`)
  - `https://<your-vercel-domain>/auth/callback` and `https://<your-vercel-domain>/reset-password` (once deployed — add both once you have a Vercel domain; also update `NEXT_PUBLIC_SITE_URL` in `apps/web`'s production env)

**Site URL** (used to build email confirmation / password reset links) should point at whichever app you consider primary, or be updated per environment — for mobile deep links it must be a scheme your app can handle (e.g. `temur://auth/callback`); for web it's a plain `https://` URL.

#### Social Sign-In (Google / Apple) Setup

Both apps sign in via Supabase's **native ID token flow** (`supabase.auth.signInWithIdToken({ provider, token, nonce })`) rather than the browser-redirect `signInWithOAuth` flow. The app talks to Google's/Apple's own SDK directly to get an ID token, then hands it to Supabase via a plain API call — the browser/app never redirects through `https://<project-ref>.supabase.co`, which is the whole reason for this over the redirect flow: Google/Apple's consent screens show *your* domain/app, not the Supabase project's. The tradeoff is more moving parts to configure per platform than the old single "Web application" OAuth client:

| | Web | Mobile (iOS) | Mobile (Android) |
|---|---|---|---|
| Google | Google Identity Services (`SocialSignInButtons.tsx`) | `@react-native-google-signin/google-signin` (`socialAuthService.ts`) | same package |
| Apple | Sign in with Apple JS (same component) | `expo-apple-authentication` (already installed/configured — Apple sign-in was already iOS-only in the UI) | not offered (unchanged — Apple has no native Android SDK) |

**Google Cloud Console** (Credentials page):

1. The existing **Web application** OAuth client (already configured for the old flow) is reused as-is for two things: web's `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (passed to Google Identity Services' `client_id`) and mobile's `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID` (passed as `webClientId` to `GoogleSignin.configure()` — required even on native, since that's what the ID token's audience needs to match). Make sure its **Authorized JavaScript origins** includes your web origin(s) (`https://www.temur.app`, `http://localhost:3000` for local dev) — it previously only needed an *Authorized redirect URI*, which this flow doesn't use.
2. Create a new **iOS** OAuth client ID (Application type: iOS, Bundle ID: `com.calpin.temur`). Google gives you both the Client ID and its reversed form (the iOS URL scheme):
   - Client ID → `EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID` (in `apps/mobile/.env` and every EAS environment — `development`/`preview`/`production`, same as the existing `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID`).
   - Reversed Client ID (`com.googleusercontent.apps.…`) → replace the placeholder in `apps/mobile/app.json`'s `@react-native-google-signin/google-signin` plugin config (`iosUrlScheme`).
3. Create a new **Android** OAuth client ID (Application type: Android, Package name: `com.calpin.temur`, SHA-1 certificate fingerprint). Get the SHA-1 for your EAS-managed keystore via `eas credentials` (select Android → your build profile → "Keystore: Manage everything needed to build your project" shows it). Repeat for every signing config you build with (debug/preview/production can have different keystores → different SHA-1s → separate Android OAuth clients, one per fingerprint). No app.json change needed — Android matches by package name + SHA-1 automatically, not by an explicit client ID passed in code.
4. **Supabase Dashboard → Authentication → Providers → Google**: update the **Client IDs** field to a comma-separated list with the **Web client first**: `<web client id>,<ios client id>,<android client id>`. Also enable **Skip nonce check** — `@react-native-google-signin`'s iOS SDK doesn't support passing Supabase's nonce through, so this is required for native iOS Google sign-in specifically (per Supabase's own docs), even though web and Android both do send a nonce.

**Apple Developer**:

1. The app's **App ID** (`com.calpin.temur`) needs the "Sign In with Apple" capability enabled — check Certificates, Identifiers & Profiles → Identifiers → the app's App ID. (`apps/mobile/app.json` already has `usesAppleSignIn: true` and the `expo-apple-authentication` config plugin from earlier scaffolding, so no app.json change needed here — just confirm the capability is actually turned on for the App ID itself.)
2. Native iOS doesn't need a separate Services ID — it authenticates directly against the Bundle ID.
3. The existing **Services ID** (used for the old web redirect flow) is reused for web's Sign in with Apple JS. Update its **Return URLs** to your actual site (e.g. `https://www.temur.app/login`) — the popup-mode JS flow only falls back to a real redirect in edge cases, but Apple still validates the registered URL, and the old value (`https://<project-ref>.supabase.co/auth/v1/callback`) no longer applies. Also double check its associated **Domains and Subdomains** covers `temur.app`.
4. **Supabase Dashboard → Authentication → Providers → Apple**: update **Client IDs** to a comma-separated list with the **Services ID first**: `<services id>,com.calpin.temur`.

**Env vars to set** (see `apps/web/.env.local.example` / `apps/mobile/.env.example` for placeholders):
- Web: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (= the Web client ID above), `NEXT_PUBLIC_APPLE_CLIENT_ID` (= the Services ID) — in `.env.local` and Vercel's project env vars.
- Mobile: `EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID` (new) — in `apps/mobile/.env` and every EAS environment.

**Rebuild required on mobile**: `@react-native-google-signin/google-signin` uses native code, so Expo Go can no longer run the app — use a development or preview build (`npm run build:ios:dev` / `npm run build:ios:preview`, or `expo run:ios`/`expo run:android` locally) after `npx expo prebuild --clean` picks up the new config plugins.

**Local stack**: testing this flow against the local Supabase stack needs the same Client IDs/Skip-nonce-check config as above applied to `[auth.external.google]`/`[auth.external.apple]` in `supabase/config.toml` (`client_id` there only takes one value — for local testing, use just the Web client ID; native mobile against local Supabase is a much bigger lift, so it's more practical to test native flows against the remote project and reserve local for the web flow only). Apple's web flow additionally needs `http://localhost:3000` accepted, which — same as before — Apple doesn't allow, so Apple sign-in still isn't testable locally short of an HTTPS tunnel (e.g. ngrok).

### Running Against a Local Supabase Stack

Instead of a remote project, you can point either app at a local Supabase stack (`supabase start`, requires Docker):

- **Studio** — http://127.0.0.1:54323 — browse/edit tables, and manually add pre-confirmed users under Authentication → Users.
- **Inbucket** (fake mail catcher) — http://127.0.0.1:54324 — local Supabase never sends real emails; password reset / magic link / email-change messages land here instead so you can open them and grab the link/OTP.

Signup email confirmation is already disabled for local dev (`auth.email.enable_confirmations = false` in `supabase/config.toml`), so signing up through the app logs you in immediately without needing Inbucket at all.

#### Troubleshooting: authenticated Edge Function calls return `{"msg":"Invalid JWT"}`

If every authenticated call to an Edge Function (`supabase.functions.invoke(...)`) fails at the gateway with `Invalid JWT` — even though the same JWT works fine against `/rest/v1` — the local stack's Auth service is issuing ES256-signed tokens that an older Supabase CLI's bundled edge-runtime can't verify (`Key for the ES256 algorithm must be of type CryptoKey`, visible via `docker logs supabase_edge_runtime_<project>`). Upgrade the CLI (`brew upgrade supabase` or equivalent) and run `supabase stop && supabase start` — the newer CLI issues HS256 tokens locally instead, which resolves it. `supabase start` will need to pull several new image versions after an upgrade, which can take a few minutes; let it finish rather than assuming it's hung if `docker ps` briefly shows no containers.

## Testing

### Unit Tests (Jest)

```bash
npm test -w apps/mobile
npm test -w packages/shared
```

### Integration Tests (Deno)

Tests for Supabase Edge Functions. Requires Docker and local Supabase.

```bash
supabase start
cd supabase && deno task test
```

> **Note:** If `deno` is not in your PATH, install it with:
> ```bash
> curl -fsSL https://deno.land/install.sh | bash
> ```

### E2E Tests (Maestro)

End-to-end tests for critical mobile user flows. Requires Maestro CLI.

```bash
# Install Maestro (first time only)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Start the app, then in another terminal:
cd apps/mobile
npx expo start --go --ios
maestro test .maestro/
```

> **Note:** Maestro requires Java 17+. Install with `brew install openjdk@17`.

### Test Summary

| Type | Location | Command |
|------|----------|---------|
| Unit (mobile) | `apps/mobile/src/__tests__/` | `npm test -w apps/mobile` |
| Unit (shared) | `packages/shared/src/__tests__/` | `npm test -w packages/shared` |
| Integration | `supabase/tests/` | `deno task test` |
| E2E | `apps/mobile/.maestro/` | `maestro test .maestro/` |

## Database Features

### Avatar Cleanup

The database automatically cleans up old avatar files from storage when:
- A user changes their profile avatar (old avatar is deleted)
- A user is deleted from the database (their avatar is deleted)

This is implemented in `supabase/migrations/20260122000100_initial_schema.sql`.

## Deployment

### Database Migrations

Push new migrations to the remote Supabase database:

```bash
supabase db push
# Shows which migrations will be applied and asks for confirmation
```

#### Troubleshooting: "permission denied to alter role" / `cli_login_postgres`

`supabase db push` (and `db pull`, `migration list`) normally authenticate via a
temporary OAuth-managed Postgres role. On some projects this fails with:

```
unexpected login role status 400: {"message":"Failed to create login role: ERROR:  42501: permission denied to alter role
DETAIL:  Only roles with the CREATEROLE attribute and the ADMIN option on role "cli_login_postgres" may alter this role.
```

This is a known, currently-open bug in Supabase's Management API (see
[supabase/cli#5091](https://github.com/supabase/cli/issues/5091)) — it isn't fixed by
re-logging in or upgrading the CLI. Work around it by skipping the broken flow and
authenticating with the database password directly (`SUPABASE_PASSWORD` in `apps/mobile/.env`):

```bash
SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_PASSWORD=' apps/mobile/.env | cut -d '=' -f2-) supabase db push
```

### Edge Functions

```bash
supabase functions deploy {specific-edge-function}   # deploy one
supabase functions deploy                              # deploy all
```

> **Note:** Make sure `supabase/.env` contains any secrets the functions need before deploying.

#### Troubleshooting: `supabase secrets set` silently overwrites unrelated secrets

Running `supabase secrets set KEY=VALUE` from this directory — even without `--env-file` — also silently re-pushes **every other key already in `supabase/.env`**, not just the one you passed. Confirmed by temporarily removing `supabase/.env` and re-running a single-key `set`: only that key's `updated_at` moved on the remote project: with the file present, every key in it moves together on every call.

**This is not just "fills in unset keys" — a stale value in `supabase/.env` can silently win over an explicit argument for that same key.** Caught this the hard way: ran `supabase secrets set RESEND_FROM_EMAIL="Temur <notifications@temur.app>"` while `supabase/.env` still had the old `onboarding@resend.dev` sandbox value on disk, and the *old* value ended up live — confirmed via Resend's own delivery log (`from: Temur <onboarding@resend.dev>`), not just the CLI's success message, which gave no indication anything was wrong. Re-running the exact same command after fixing `supabase/.env` first made it stick. **Moral: always fix `supabase/.env` on disk *before* running `secrets set`, never after or in the same breath — the file's contents win, not your CLI args.**

This means `supabase/.env` must never contain a value that's only correct for local dev if it differs from what should be live remotely — any later `secrets set` call, for any unrelated secret, will silently push the local value over the remote one (even overriding a correct value you just explicitly passed for that same call, per above). `RESEND_FROM_EMAIL` and `PUBLIC_SITE_URL` are the two that bit us: keep them set to their real production values in `supabase/.env` even though they're inert for local dev (no `RESEND_API_KEY` means email is never actually sent locally, so the values are never observed). If you ever need a genuinely different value locally vs. remotely for some future secret, use `--env-file` pointed at an explicit, separate file instead of relying on the bare `KEY=VALUE` form.

**When in doubt, don't trust `secrets set`'s success message** — it reports success even when a value silently didn't change the way you expected. Verify against real behavior instead: for email-related secrets, check the actual delivered `from`/content via Resend's dashboard or API (`list-emails`/`get-email`), not just that the command exited 0.

#### Email Notifications Setup

`send-notification` and `sweep-visible-games` send email (via [Resend](https://resend.com)) alongside push — web's only out-of-band channel, since it has no push registration. Without these, email is skipped silently and push is unaffected.

1. Create a free Resend account and API key.
2. (Optional, recommended for production) verify a sending domain in the Resend dashboard — without one, email sends from Resend's shared `onboarding@resend.dev` sandbox address, which works but is less deliverable at scale. `temur.app` is already verified this way (DKIM/SPF records added via the Vercel-managed DNS, since the domain was bought through Vercel).
3. Set the secrets on your Supabase project (matches how `EDGE_FUNCTION_SECRET` is provisioned):

   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   supabase secrets set RESEND_FROM_EMAIL="Temur <notifications@temur.app>"
   supabase secrets set PUBLIC_SITE_URL=https://www.temur.app  # used to build the "Open Temur" link in emails
   ```

   Prefer scoping the API key to `sending_access` on just this domain (Resend → API Keys → Create), rather than reusing a full-access key, in case it ever leaks.

4. For local dev, `supabase/.env` already has `RESEND_FROM_EMAIL`/`PUBLIC_SITE_URL` set to these same production values (see `supabase/.env.example`) — see the troubleshooting note above for why that matters even though they're inert locally. `RESEND_API_KEY` stays unset locally on purpose.

#### Visible-Games Sweep (pg_cron → Edge Function) Setup

The `sweep-visible-games` pg_cron job (see `supabase/migrations/20260812090000_add_notification_infra.sql`) doesn't call the edge function directly — its trigger function, `private.trigger_visible_games_sweep()`, reads a shared secret and the project's functions base URL from **Supabase Vault** (`vault.decrypted_secrets`), separate from `supabase secrets set`. If either is missing, the function silently `RAISE WARNING`s and returns without making the HTTP call — the cron job itself still shows as "succeeded" in `cron.job_run_details`, so this failure mode is easy to miss (it went unnoticed on the `temur` project for weeks). A quick way to spot it: those runs complete in a few milliseconds, since `net.http_post` is async and only enqueues on success — check `net._http_response` for actual delivered responses (a `200` with `{"swept":N,"notified":N}` body) to confirm it's really firing.

This isn't provisioned by any migration or `supabase secrets set` call — it has to be set once per environment via the SQL editor (or the Supabase MCP's `execute_sql`), after the `EDGE_FUNCTION_SECRET` Edge Function secret is set (see [Edge Functions](#edge-functions) below — it must match this exact value):

```sql
select vault.create_secret('<same value as the EDGE_FUNCTION_SECRET edge function secret>', 'edge_function_secret');
select vault.create_secret('<project's functions base URL, e.g. https://<ref>.supabase.co>', 'project_functions_url');
```

#### Auth Emails (Resend)

By default, Supabase Auth sends its own transactional emails (password reset, signup confirmation, etc.) through its built-in mailer, styled with Supabase's plain default templates. `send-auth-email` (`supabase/functions/send-auth-email`) replaces that entirely via Supabase Auth's [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook): Supabase Auth calls this function instead, and it sends a branded email through the same Resend integration used above (`buildAuthEmail` in `supabase/functions/_shared/email.ts`). Today the app only actually triggers the `recovery` (forgot password, mobile-only for now) flow, but the hook takes over *every* auth email type once enabled, so it handles all of them (signup, invite, magic link, email change, reauthentication) generically.

This is only configured on the **remote** Supabase project, not local dev — the same "deployed-only" split used for [Sentry](#error-monitoring-sentry): local dev keeps using Supabase's default local mailer (viewable at Inbucket, `http://127.0.0.1:54324` when running `supabase start`), so testing the password-reset flow locally doesn't require a Resend key or burn any send quota. `supabase/config.toml` deliberately has no `[auth.hook.send_email]` entry for this reason.

To enable it on the remote project:

1. Make sure `RESEND_API_KEY` (and optionally `RESEND_FROM_EMAIL`) are already set as described above.
2. Deploy the function with JWT verification disabled — Supabase Auth calls it without a user JWT, authenticating instead via a webhook signature:

   ```bash
   supabase functions deploy send-auth-email --no-verify-jwt
   ```

3. In the Supabase dashboard, go to **Authentication → Hooks**, create a **Send Email hook**, select **HTTPS**, and paste the deployed function's URL.
4. Click **Generate Secret** to get a webhook secret (format `v1,whsec_...`), then set it:

   ```bash
   supabase secrets set SEND_EMAIL_HOOK_SECRET="v1,whsec_your_generated_secret"
   ```

5. Click **Create** to save the hook.

From then on, every Supabase Auth email on the remote project routes through Resend with Temur's own branding instead of Supabase's default templates.

#### Supabase Edge Function Configuration

Sometimes Edge Functions need to be configured to disable gateway-level JWT verification because:
- The function needs to verify the user's JWT and extract the user ID
- It then uses that user ID to call RPC functions with proper auth context
- Gateway verification would prevent the function from accessing the JWT payload

Provided the function still performs authentication internally, this is still secure. To deploy a function with disabled gateway-level JWT verification, use the cli flag `--no-verify-jwt` when deploying:

```bash
supabase functions deploy {function-name} --no-verify-jwt
```

### Error Monitoring (Sentry)

Both apps report uncaught errors to Sentry (org `softwire-zd`, projects `temur-web`/`temur-mobile`) — but **only from deployed/built environments**, never from local dev, so local work doesn't eat into the free-tier event quota: web checks `NODE_ENV === 'production'` (true for `next build`, false for `next dev`) in `instrumentation.ts`/`instrumentation-client.ts`; mobile checks `!__DEV__` (true for a real EAS build, false for Expo Go or a dev client connected to Metro) in `App.tsx`. The DSNs themselves aren't secret and are already committed in `apps/web/.env.local.example`/`apps/mobile/.env.example` — no setup needed for errors to start showing up in the Sentry dashboard once deployed. One optional step remains for **readable stack traces** (otherwise Sentry shows minified/bundled code):

- **Web (Vercel)**: create an **Organization Token** (Sentry → Settings → Organization Tokens — not Personal Tokens or OAuth Applications; org tokens aren't tied to an individual account, which is what CI/build integrations should use) with the `project:releases` scope, and add it as a `SENTRY_AUTH_TOKEN` environment variable in the Vercel project. `next.config.ts`'s `withSentryConfig` picks it up automatically at build time to upload source maps.
- **Mobile (EAS)**: add the same token as an EAS secret (`eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>` from `apps/mobile`). The `@sentry/react-native/expo` config plugin uploads source maps during `eas build` when it's present.

Without the token, both apps still build and report errors fine — you just won't get de-minified stack traces in the Sentry UI.

### Web Analytics (Vercel)

`apps/web` uses [Vercel Web Analytics](https://vercel.com/docs/analytics) (`@vercel/analytics`) — web-only, since it's a Vercel-specific product with no mobile equivalent. The `<Analytics />` component in `apps/web/src/app/layout.tsx` tracks page views automatically; no setup is needed beyond enabling Web Analytics for the project in the Vercel dashboard (Project → Analytics). Like Sentry, it only reports in deployed/production builds — locally it just logs to the console instead of sending events (`@vercel/analytics/server`'s own `NODE_ENV` check), so local dev doesn't consume any quota.

On top of automatic page views, `apps/web/src/lib/analytics.ts` defines a small set of custom events (`AnalyticsEvent`) tracked from Server Actions via `@vercel/analytics/server`'s `track()`, covering the core funnel: `Signed Up`, `Game Created`, `Signed Up For Game` (with a `waitlisted` property), `Withdrew From Game`, `Group Created`, `Friend Request Sent`, `Friend Request Accepted`, `Game Result Submitted`, `Player Rated`, and `Bug Report Submitted`. Add new ones to the `AnalyticsEvent` map rather than passing raw strings to `track()`, to keep event names consistent and avoid typos. Custom events on Hobby-tier Vercel projects are capped at 2,500/month — keep the event list focused on funnel/engagement milestones rather than every possible interaction. View both page views and custom events in the Vercel dashboard's Analytics tab.

### Mobile App Builds

For development builds with physical devices:

```bash
cd apps/mobile
eas build --profile development --platform ios      # requires Apple Developer account
eas build --profile development --platform android
```

For production builds and app store submission, see [Build Guide](./apps/mobile/BUILD.md).

### Web App Deployment

`apps/web` deploys to Vercel. In the Vercel project settings, set **Root Directory** to `apps/web` (monorepo setup) and configure the same environment variables as `apps/web/.env.local.example`, using your production `NEXT_PUBLIC_SITE_URL`. Remember to add the deployed domain to Supabase's Auth redirect allow-list (see "Authentication Redirect Setup" above).

### Universal Links (iOS) / App Links (Android) Setup

Notification emails (friend requests, group invites, game invites/results, etc. — `send-notification`/`sweep-visible-games`) link to `https://www.temur.app/...` URLs built from `PUBLIC_SITE_URL`. With Universal Links (iOS) / App Links (Android) configured, tapping one of these opens the mobile app directly if it's installed and falls back to the browser otherwise — the OS resolves the same `https://` URL to either the app or the browser depending on whether the app is installed and verified, so there's no separate `temur://` link to generate or maintain.

Two pieces are already wired up in this repo; two manual steps remain, each marked with a `REPLACE_WITH_...` placeholder only you can fill in from your Apple/Google developer accounts:

- **`apps/mobile/app.json`** declares `ios.associatedDomains: ["applinks:www.temur.app"]` and an `autoVerify` Android `https` intent filter for `www.temur.app` — this is what tells each OS to trust that domain and (for iOS) triggers the device to fetch and cache the AASA file below on install/update.
- **`apps/web/src/app/.well-known/apple-app-site-association/route.ts`** and **`apps/web/public/.well-known/assetlinks.json`** are what each OS fetches from `https://www.temur.app/.well-known/...` to verify the app is actually authorized for that domain (the mechanism that stops any other app from claiming your links). Only the paths notification emails actually link to (`/games`, `/games/*`, `/friends`, `/friends/requests`, `/groups/invites`, `/reset-password`) are claimed — everything else (login, profile, group detail, etc.) has no matching mobile screen yet and keeps opening in the browser. `apps/mobile/src/utils/deepLinkRouting.ts` is the in-app side of that same route table — it maps an incoming `temur://` or `https://www.temur.app/...` link to the matching screen (`useAuthDeepLinks` wires it in); update both together if you add a new claimed path.

Manual steps:

1. **iOS** — find your Apple Developer **Team ID** (developer.apple.com → Membership, or `eas credentials`), then replace `REPLACE_WITH_APPLE_TEAM_ID` in `apps/web/src/app/.well-known/apple-app-site-association/route.ts` with it (it's used as `TEAMID.com.calpin.temur`). Deploy web, then verify with `curl -s https://www.temur.app/.well-known/apple-app-site-association` (should return valid JSON) and Apple's own validator (https://search.developer.apple.com/appsearch-validation-tool/). iOS caches AASA lookups at install/update time, so a fresh install may be needed to see a change take effect.
2. **Android** — once you have a release signing key (EAS-managed or your own keystore), get its SHA-256 fingerprint via `eas credentials` (Android → your build profile → Keystore) or `keytool -list -v -keystore <path> -alias <alias>`, then replace `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT` in `apps/web/public/.well-known/assetlinks.json` with it (colon-separated hex, as printed). Deploy web, then verify with `adb shell pm get-app-links com.calpin.temur` after installing a release build, or Google's Statement List Generator/Tester (https://developers.google.com/digital-asset-links/tools/generator).

Until both placeholders are replaced, links behave exactly as they do today — they just always open in the browser. An unverified/placeholder AASA or `assetlinks.json` fails closed rather than breaking anything.

## Documentation

- [Web feature parity plan](./docs/web-feature-parity-plan.md) - what's built vs. outstanding on `apps/web`
- [Build Guide](./apps/mobile/BUILD.md) - Building and submitting to app stores
- [Privacy Policy](./PRIVACY_POLICY.md) - App privacy policy
- [TestFlight Setup](./TESTFLIGHT_SETUP.md) - Steps for submitting to App Store/TestFlight

## License

MIT
