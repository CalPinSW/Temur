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

### Development Build (for testing push notifications)
```bash
# iOS Simulator
eas build --profile development --platform ios

# Physical iOS device
eas build --profile development --platform ios --local

# Android
eas build --profile development --platform android
```

### Preview Build (internal testing)
```bash
eas build --profile preview --platform all
```

### Production Build
```bash
eas build --profile production --platform all
```

## Submitting to App Stores

### iOS (App Store Connect)
1. `eas.json`'s `submit.production.ios.appleTeamId` reads from the `APPLE_TEAM_ID` EAS environment variable (`$APPLE_TEAM_ID`) — the same Team ID used by apps/web's Universal Links `.well-known` routes (see root README's "Universal Links (iOS) / App Links (Android) Setup"). Set it once via `eas env:create --scope project --name APPLE_TEAM_ID --value <team_id> --environment production` (or the EAS dashboard) if it isn't already set. Add `appleId` (your Apple ID email) and `ascAppId` (App Store Connect App ID) to `eas.json`'s same `ios` block too — those aren't shared with any other part of the app, so there's no env var for them.

2. Submit:
   ```bash
   eas submit --platform ios
   ```

### Android (Google Play)
1. Create a service account in Google Play Console
2. Download the JSON key and save as `google-services.json`
3. Submit:
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
