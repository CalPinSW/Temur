# TestFlight Setup Guide

## Prerequisites Checklist

- [x] Apple Developer Program membership ($99/year)
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged into EAS (`eas login`)
- [ ] App created in App Store Connect

## Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **Apps** → **+** (Add App)
3. Fill in the details:
   - **Platform**: iOS
   - **Name**: {App Name}
   - **Primary Language**: English (U.K.)
   - **Bundle ID**: Select `com.{app_slug}.app` (or create it if not listed)
   - **SKU**: `{app_sku_name}` 
   - **User Access**: Full Access

4. After creation, note down:
   - **App Store Connect App ID** (found in App Information, looks like `1234567890`)
   - **Team ID** (found in Membership section, looks like `ABC123XYZ`)

## Step 2: Update eas.json with Your Credentials

Edit `apps/mobile/eas.json` and replace the placeholder values:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-actual-email@example.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABC123XYZ"
    }
  }
}
```

## Step 3: Build for Production

From the `apps/mobile/` directory, run:

```bash
cd apps/mobile
eas build --platform ios --profile production
```

This will:
- Build your app in the cloud
- Auto-increment the build number
- Generate an `.ipa` file ready for TestFlight
- Take approximately 15-20 minutes

**Note**: You can monitor the build progress at the URL provided in the terminal.

## Step 4: Submit to TestFlight

Once the build completes, submit it to TestFlight:

```bash
eas submit --platform ios --latest
```

This will:
- Upload the build to App Store Connect
- Make it available for TestFlight testing
- Trigger Apple's automated review (usually 1-2 days)

## Step 5: Set Up TestFlight

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app → **TestFlight** tab
3. Wait for the build to appear (may take a few minutes after submission)
4. Once the build shows "Ready to Submit", click on it
5. Fill in:
   - **What to Test**: Brief description of what testers should focus on
   - **Test Information**: Any login credentials or special instructions
   - **Export Compliance**: Select "No" if you're not using encryption beyond HTTPS

6. Click **Submit for Review**

## Step 6: Add Testers

### Internal Testing (Immediate, no review needed)
1. Go to **TestFlight** → **Internal Testing**
2. Click **+** to add internal testers
3. Add up to 100 users from your App Store Connect team

### External Testing (After Apple review, 1-2 days)
1. Go to **TestFlight** → **External Testing**
2. Create a new group (e.g., "Friends")
3. Click **+** to add testers by email
4. Add up to 10,000 external testers
5. Share the public link with your friends

## Step 7: Share with Friends

Once approved, you'll get a TestFlight public link like:
```
https://testflight.apple.com/join/XXXXXXXX
```

**Instructions for your friends:**
1. Install the **TestFlight** app from the App Store (free)
2. Open the link you sent them
3. Tap **Accept** → **Install**
4. The app will appear on their home screen

## Updating the App

When you make changes and want to push an update:

```bash
# Build new version
cd apps/mobile
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest
```

Testers will automatically get notified of the update in TestFlight.

## Troubleshooting

### Build fails with "No valid code signing identity"
- Make sure you're logged into EAS: `eas login`
- EAS will automatically handle provisioning profiles and certificates

### "Missing compliance" error
- In App Store Connect, go to your build → Export Compliance
- Answer the encryption questions (usually "No" for standard apps)

### Testers can't install
- Make sure they have iOS 13.0 or later
- Verify the TestFlight link is correct
- Check that the build is approved and "Ready to Test"

### Build takes too long
- Cloud builds typically take 15-20 minutes
- You can close the terminal; the build continues in the cloud
- Check status at: `eas build:list`

## Environment Variables

If your app needs production environment variables (like Supabase keys), set them as EAS secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "sb_publishable_xxx"
```

## Pre-Launch Checklist

Before sharing with friends:

- [ ] Test the app thoroughly on a physical device
- [ ] Verify Apple Sign In works correctly
- [ ] Verify push notifications work
- [ ] Check that friend invites work properly
- [ ] Test functionality flow end-to-end
- [ ] Ensure privacy policy is accessible
- [ ] Update app version in `app.json` if needed

## Next Steps After TestFlight

Once you're confident from friend testing:

1. Prepare App Store listing (screenshots, description, keywords)
2. Submit for App Store review
3. See [BUILD.md](./apps/mobile/BUILD.md) for full App Store submission guide

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view <build-id>

# Check submission status
eas submit:list

# Cancel a build
eas build:cancel

# View project configuration
eas config
```

## Support

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
