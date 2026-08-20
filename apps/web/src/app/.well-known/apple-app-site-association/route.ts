import { NextResponse } from 'next/server';

// REPLACE_WITH_APPLE_TEAM_ID — the 10-character Apple Developer Team ID
// (developer.apple.com → Membership, or `eas credentials`). Until this is
// replaced, iOS can never verify the app owns temur.app links, so Universal
// Links silently fail closed (links keep opening in the browser, same as
// before this file existed) rather than breaking anything — see README's
// "Universal Links (iOS) / App Links (Android) Setup" section.
const APPLE_TEAM_ID = 'REPLACE_WITH_APPLE_TEAM_ID';

// Served at https://www.temur.app/.well-known/apple-app-site-association —
// the file iOS fetches (over HTTPS, no redirects allowed) to verify this
// domain is allowed to open com.calpin.temur, per the
// ios.associatedDomains entitlement in apps/mobile/app.json. Only the paths
// buildNotificationLink (supabase/functions/_shared/email.ts) actually
// links to are claimed — everything else (login, profile, group detail, …)
// has no matching mobile screen yet and keeps opening in the browser.
export async function GET() {
  return NextResponse.json({
    applinks: {
      details: [
        {
          appIDs: [`${APPLE_TEAM_ID}.com.calpin.temur`],
          components: [
            { '/': '/games/*', comment: 'Game detail links from notification emails' },
            { '/': '/games', comment: 'Games list' },
            { '/': '/friends/requests', comment: 'Friend request links' },
            { '/': '/friends', comment: 'Friend-accepted links' },
            { '/': '/groups/invites', comment: 'Group invite links' },
            { '/': '/reset-password', comment: 'Password reset links' },
          ],
        },
      ],
    },
  });
}
