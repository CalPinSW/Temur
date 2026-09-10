# Build & Submit Guide

## Prerequisites

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure project** (first time only)
   ```bash
   eas build:configure
   ```

## Build Profiles

| Profile | Use Case |
|---------|----------|
| `development` | Dev build with hot reload (for testing push notifications) |
| `preview` | Internal testing build |
| `production` | App store submission |

## Building

`npm run build:*` goes through `scripts/eas-build.js`, which runs the EAS
build and drops the finished artifact into `apps/mobile/builds/` (gitignored)
named `temur-<appVersion>-<buildNumber>-<platform>-<profile>.<ext>` — e.g.
`temur-1.0.0-11-ios-preview.ipa`. `buildNumber` is the value EAS
auto-increments (`autoIncrement` is on for every profile in `eas.json`), so
cloud-build filenames never collide; a `.json` sidecar records the build id,
git commit and artifact URL.

```bash
npm run build:ios:dev          # dev-client build for a physical iOS device
npm run build:ios:preview      # internal-distribution iOS build
npm run build:android:preview  # internal-distribution Android APK

# any platform/profile combo:
npm run build -- --platform android --profile production

# compile on this machine instead of EAS servers (needs the full native
# toolchain; the remote build number isn't bumped, so repeated local builds
# overwrite temur-<version>-<n>-<platform>-<profile>-local.<ext>):
npm run build:ios:preview -- --local
```

Under the hood these are `eas build --platform <p> --profile <profile>`
(remote) or `… --local`; you can still call `eas` directly if you don't want
the artifact filed under `builds/`.

### Production Build
```bash
npm run build -- --platform ios --profile production
npm run build -- --platform android --profile production
```

## Submitting to App Stores

### iOS (App Store Connect)
1. Update `eas.json` with your Apple credentials:
   - `appleId`: Your Apple ID email
   - `ascAppId`: App Store Connect App ID
   - `appleTeamId`: Your team ID

2. Submit:
   ```bash
   eas submit --platform ios
   ```

### Android (Google Play)
1. Create a service account in Google Play Console with the Play Developer API enabled and grant it release access
2. Download its JSON key and save it at `apps/mobile/_secrets/temur-play.json` (the `_secrets/` dir is gitignored — this key never gets committed)
3. `eas.json`'s `submit.production.android` already points `serviceAccountKeyPath` at that file and targets the `internal` track
4. Submit:
   ```bash
   eas submit --platform android
   ```

## Environment Variables

For production, set these in EAS secrets:
```bash
eas secret:create --name SUPABASE_URL --value "your-production-url"
eas secret:create --name SUPABASE_ANON_KEY --value "your-production-key"
```

## Checklist Before Submission

- [ ] Update `app.json` version number
- [ ] Test on physical devices
- [ ] Verify all screenshots are correct sizes
- [ ] Privacy policy URL is accessible
- [ ] App description ready
- [ ] Keywords selected
