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
1. Update `eas.json` with your Apple credentials:
   - `appleId`: Your Apple ID email
   - `ascAppId`: App Store Connect App ID
   - `appleTeamId`: Your team ID

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
