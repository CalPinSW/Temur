# Mobile App Template - App Title

A mobile app for.

## Features

- 🔐 **Auth** - Secure sign in with Supabase Auth, Google and Apple social sign in supported
- 👥 **Friends System** - Add friends
- 🔗 **Easy Sharing** - Invite via friend list, share link, or QR code
- 📬 **Settlement Reminders** - Send one-time push notifications

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile App** | React Native (Expo) |
| **Backend** | Supabase Edge Functions |
| **Database** | Supabase PostgreSQL |
| **Auth** | Supabase Auth |
| **Real-time** | Supabase Realtime (WebSockets) | -- TODO

## Project Structure

```
mobile-app/
├── app/                    # React Native app (Expo)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API and external service calls
│   │   ├── store/          # State management
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helper functions
│   └── app.json
├── supabase/
│   ├── functions/          # Edge Functions
│   ├── migrations/         # Database migrations
│   └── config.toml
└── docs/                   # Additional documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`npm install -g supabase`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/CalPinSW/mobile-app-template.git
cd mobile-app-template

# Install app dependencies
cd app
npm install

# Start the development server
npx expo start
```

### Environment Setup

Create `.env` files with your credentials:

```bash
# app/.env
# Get publishable key from: Dashboard → Settings → API Keys → New API Keys
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# supabase/.env
EDGE_FUNCTION_REQUIRED_API_KEYS=your_api_keys_for_edge_functions
```

> **Note:** We use the new `sb_publishable_` key format instead of the legacy `anon` key. See [Supabase API Keys documentation](https://supabase.com/docs/guides/api/api-keys) for details.

### First-Time Setup: Connect This Demo App to a New Supabase Project

If this is your first time using the template, follow this once per new project:

1. **Create a Supabase project**
   - Go to the [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project and wait for provisioning
   - Copy the **Project URL** and **Publishable key** from **Settings → API Keys**

2. **Configure app environment variables**

   ```bash
   cp app/.env.example app/.env
   ```

   Then update `app/.env` with your real values:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Optional app metadata values (`EXPO_PUBLIC_GITHUB_REPO_URL`, support email, etc.)

3. **Configure Supabase function secrets (if using Edge Functions)**

   ```bash
   cp supabase/.env.example supabase/.env
   ```

   Fill the required keys in `supabase/.env` (for example LLM provider/API keys if your enabled functions need them).

4. **Login and link CLI to your remote Supabase project**

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

   You can find `<your-project-ref>` in your project URL, e.g. `https://<project-ref>.supabase.co`.

5. **Push the template schema to your new project**

   ```bash
   supabase db push
   ```

   This applies the consolidated schema migration at:
   - `supabase/migrations/20260122000100_initial_schema.sql`

6. **(Optional) Deploy Edge Functions**

   ```bash
   supabase functions deploy
   ```

7. **Run the app**

   ```bash
   cd app
   npx expo start
   ```

#### Authentication Redirect Setup

Configure redirect URLs in **Supabase Dashboard → Authentication → URL Configuration**:

1. **Site URL** (required for email confirmation links):
   - For **Expo Go development**: `exp://YOUR_LOCAL_IP:8081/--/auth/callback`
   - For **Development builds / Production**: `appscheme://auth/callback`
   
   > **Note:** The Site URL is where email confirmation and password reset links redirect. For mobile apps, this must be a deep link URL your app can handle. When switching between Expo Go and dev builds, you may need to update this setting.

2. **Redirect URLs** (allow-list for OAuth and email redirects):
   ```
   appscheme://auth/callback
   exp://YOUR_LOCAL_IP:8081/--/auth/callback
   ```
   
   Replace `YOUR_LOCAL_IP` with your machine's local IP (e.g., `192.168.1.166`).

3. **OAuth Provider Setup** (Google/Apple):
   - In each provider's settings, use `appscheme://auth/callback` as the redirect URI
   - For Expo Go testing, you may also need to add the `exp://` URL

#### Customizing the App Scheme

The default scheme is `appscheme`. To change it:

1. Update `app.json`:
   ```json
   {
     "expo": {
       "scheme": "yourscheme"
     }
   }
   ```

2. Update Android intent filters in `app.json` → `android.intentFilters`

3. Update `socialAuthService.ts` and `authStore.ts` to use the new scheme

4. Update Supabase Dashboard redirect URLs to match

## Project Management

### Jira Board

- **Board URL**: [{jira_user}.atlassian.net/jira/software/projects/{project_key}/boards/{board_id}](https://{jira_user}.atlassian.net/jira/software/projects/{project_key}/boards/{board_id})
- **Project Key**: `{project_key}`

### Jira CLI Setup

Install the Jira CLI:
```bash
brew install ankitpokhrel/jira-cli/jira-cli
```

Generate an API token at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens), then configure authentication:

```bash
# Add credentials to ~/.netrc
cat >> ~/.netrc << EOF
machine {jira_user}.atlassian.net
login your-email@example.com
password YOUR_API_TOKEN
EOF

chmod 600 ~/.netrc
```

### Common Jira CLI Commands

```bash
# List all issues
jira issue list

# List issues by status
jira issue list -s"To Do"
jira issue list -s"In Progress"

# View issue in browser
jira open {project_key}-8

# Move issue to In Progress
jira issue move {project_key}-8 "In Progress"

# Move issue to Done
jira issue move {project_key}-8 "Done"

# View epic and its children
jira epic list
jira issue list -P {project_key}-2    # List tasks under Phase 1 epic

# Filter by label
jira issue list -l"auth"
jira issue list -l"database"

# Create individual issues:
jira issue create -tTask -s"Task summary" -P"{project_key}-2" -l"label"


## Testing

### Unit Tests (Jest)

```bash
cd app
npm test
```

### Integration Tests (Deno)

Tests for Supabase Edge Functions. Requires Docker and local Supabase.

```bash
# Start local Supabase
supabase start

# Run tests
cd supabase
deno task test
```

> **Note:** If `deno` is not in your PATH, install it with:
> ```bash
> curl -fsSL https://deno.land/install.sh | bash
> ```

### E2E Tests (Maestro)

End-to-end tests for critical user flows. Requires Maestro CLI.

```bash
# Install Maestro (first time only)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Start the app
cd app
npx expo start --go --ios

# In another terminal, run tests
cd app
maestro test .maestro/
```

> **Note:** Maestro requires Java 17+. Install with `brew install openjdk@17`.

### Test Summary

| Type | Location | Command |
|------|----------|---------|
| Unit | `app/src/__tests__/` | `npm test` |
| Integration | `supabase/tests/` | `deno task test` |
| E2E | `app/.maestro/` | `maestro test .maestro/` |

## Database Features

### Avatar Cleanup

The database automatically cleans up old avatar files from storage when:
- A user changes their profile avatar (old avatar is deleted)
- A user is deleted from the database (their avatar is deleted)

This is implemented in `supabase/migrations/20260122000100_initial_schema.sql`.

## Deployment

### Database Migrations

The Supabase schema is consolidated into a single initial migration:

- `supabase/migrations/20260122000100_initial_schema.sql`

It includes the template domain for:

- profiles
- friendships
- notification preferences and push tokens
- avatar storage + cleanup triggers

When you create new database migrations, push them to the remote Supabase database:

```bash
# Push all pending migrations
supabase db push

# The command will show which migrations will be applied and ask for confirmation
```

### Edge Functions

Deploy updated Edge Functions to Supabase:

```bash
# Deploy a specific function
supabase functions deploy {specific-edge-function}

# Deploy all functions
supabase functions deploy
```

> **Note:** Make sure your `.env` file in the `supabase/` directory contains the necessary secrets (like `EDGE_FUNCTION_REQUIRED_API_KEYS`) before deploying.

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
cd app

# Build for iOS (requires Apple Developer account)
eas build --profile development --platform ios

# Build for Android
eas build --profile development --platform android
```

For production builds and app store submission, see [Build Guide](./app/BUILD.md).

## Documentation

- [Build Guide](./app/BUILD.md) - Building and submitting to app stores
- [Privacy Policy](./PRIVACY_POLICY.md) - App privacy policy
- [TestFlight Setup](./TESTFLIGHT_SETUP.md) - Steps for submitting to App Store/TestFlight

## License

MIT
