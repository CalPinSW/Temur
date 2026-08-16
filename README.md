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

Both apps already call `supabase.auth.signInWithOAuth({ provider: 'google' | 'apple' })` — this is purely a provider-configuration task in **Supabase Dashboard → Authentication → Providers**, not a code change. The callback URL both providers need registered is `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase's own hosted endpoint — distinct from the app-level redirect URLs in "Authentication Redirect Setup" above, which is where Supabase redirects back to *after* this).

- **Google**: Google Cloud Console → Credentials → OAuth client ID → type **Web application** (the only type needed — the browser-redirect flow doesn't use a native SDK on any platform) → add the callback URL as an Authorized redirect URI → paste the Client ID/Secret into Supabase.
- **Apple**: needs a paid Apple Developer account. Create a **Services ID** (separate from the app's Bundle ID `com.calpin.temur`) with "Sign in with Apple" enabled, registering the callback URL as its Return URL. The Services ID becomes Supabase's Client ID. For the **Secret Key (for OAuth)** field, Supabase generates the required signed JWT for you from a Sign in with Apple key (Keys → + → download the `.p8` once, it can't be re-downloaded) — this generated secret **expires in ≤6 months** and needs regenerating/re-pasting before then, or Apple sign-in silently starts failing with no warning.
- If a sign-in attempt just bounces back to `/login` with nothing shown, check the server logs / the `?error=` query param `apps/web/src/app/auth/callback/route.ts` now surfaces on failure — it used to swallow the Supabase error silently.

**Local stack**: `supabase/config.toml` has `[auth.external.google]`/`[auth.external.apple]` blocks (disabled by default) with secrets read from `supabase/.env`'s `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`/`SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` (gitignored, never commit real values). To actually use them locally:
- **Google** works fine locally — Google allows loopback redirect URIs for testing, so just add `http://127.0.0.1:54321/auth/v1/callback` as an *additional* Authorized redirect URI on the same OAuth client used for production, fill in `client_id`/the env secret, and set `enabled = true`.
- **Apple generally doesn't work locally** — Apple's Services ID Return URL/Domain fields require a real HTTPS domain, and reject `127.0.0.1`/`localhost`. Short of standing up an HTTPS tunnel (e.g. ngrok) and registering that domain too, test Apple sign-in against the remote project instead.

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

## Documentation

- [Web feature parity plan](./docs/web-feature-parity-plan.md) - what's built vs. outstanding on `apps/web`
- [Build Guide](./apps/mobile/BUILD.md) - Building and submitting to app stores
- [Privacy Policy](./PRIVACY_POLICY.md) - App privacy policy
- [TestFlight Setup](./TESTFLIGHT_SETUP.md) - Steps for submitting to App Store/TestFlight

## License

MIT
