import { NextResponse } from 'next/server';

// The Apple Developer Team ID (developer.apple.com → Membership, or
// `eas credentials`). If this is ever wrong or unset, iOS can't verify the
// app owns temur.app links, so Universal Links silently fail closed (links
// keep opening in the browser) rather than breaking anything — see
// README's "Universal Links (iOS) / App Links (Android) Setup" section.
const APPLE_TEAM_ID = '49CC6LJ3XA';

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
            { '/': '/groups/join/*', comment: 'Group join links' },
            { '/': '/reset-password', comment: 'Password reset links' },
          ],
        },
      ],
    },
  });
}
