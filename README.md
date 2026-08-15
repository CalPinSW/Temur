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
git clone https://github.com/CalPinSW/football-org-app.git
cd football-org-app

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

6. **Run the apps** — see "Run the mobile app" / "Run the web app" above.

#### Authentication Redirect Setup

Configure redirect URLs in **Supabase Dashboard → Authentication → URL Configuration** (mirrors `supabase/config.toml`'s local settings — keep both in sync):

- **Mobile** (deep link, custom scheme `temur`):
  - `temur://auth/callback` (dev builds / production)
  - `exp://YOUR_LOCAL_IP:8081/--/auth/callback` (Expo Go development — replace `YOUR_LOCAL_IP` with your machine's local IP)
- **Web**:
  - `http://localhost:3000/auth/callback` (local dev)
  - `https://<your-vercel-domain>/auth/callback` (once deployed — add this once you have a Vercel domain; also update `NEXT_PUBLIC_SITE_URL` in `apps/web`'s production env)

**Site URL** (used to build email confirmation / password reset links) should point at whichever app you consider primary, or be updated per environment — for mobile deep links it must be a scheme your app can handle (e.g. `temur://auth/callback`); for web it's a plain `https://` URL.

### Running Against a Local Supabase Stack

Instead of a remote project, you can point either app at a local Supabase stack (`supabase start`, requires Docker):

- **Studio** — http://127.0.0.1:54323 — browse/edit tables, and manually add pre-confirmed users under Authentication → Users.
- **Inbucket** (fake mail catcher) — http://127.0.0.1:54324 — local Supabase never sends real emails; password reset / magic link / email-change messages land here instead so you can open them and grab the link/OTP.

Signup email confirmation is already disabled for local dev (`auth.email.enable_confirmations = false` in `supabase/config.toml`), so signing up through the app logs you in immediately without needing Inbucket at all.

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

#### Supabase Edge Function Configuration

Sometimes Edge Functions need to be configured to disable gateway-level JWT verification because:
- The function needs to verify the user's JWT and extract the user ID
- It then uses that user ID to call RPC functions with proper auth context
- Gateway verification would prevent the function from accessing the JWT payload

Provided the function still performs authentication internally, this is still secure. To deploy a function with disabled gateway-level JWT verification, use the cli flag `--no-verify-jwt` when deploying:

```bash
supabase functions deploy {function-name} --no-verify-jwt
```

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
