import { NextResponse } from 'next/server';

// The release signing key's SHA-256 certificate fingerprint (colon-
// separated hex), set via ANDROID_SHA256_CERT_FINGERPRINT in
// apps/web/.env.local (and the Vercel project's env vars in production) —
// never exposed to the client, so no NEXT_PUBLIC_ prefix. Get it via
// `eas credentials` (Android → your build profile → Keystore) or
// `keytool -list -v -keystore <path> -alias <alias>` once a release
// signing key exists. Until it's set, Android can never verify the app
// owns temur.app links, so App Links silently fail closed (links keep
// opening in the browser, same as before this file existed) rather than
// breaking anything — see README's "Universal Links (iOS) / App Links
// (Android) Setup" section.
const ANDROID_SHA256_CERT_FINGERPRINT =
  process.env.ANDROID_SHA256_CERT_FINGERPRINT ?? 'REPLACE_WITH_RELEASE_SHA256_FINGERPRINT';

// Served at https://www.temur.app/.well-known/assetlinks.json — the file
// Android fetches to verify this domain is allowed to open com.calpin.temur,
// per the autoVerify https intent filter in apps/mobile/app.json.
export async function GET() {
  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.calpin.temur',
        sha256_cert_fingerprints: [ANDROID_SHA256_CERT_FINGERPRINT],
      },
    },
  ]);
}
