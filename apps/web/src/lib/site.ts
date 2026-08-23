// NEXT_PUBLIC_SITE_URL only needs to be set to pin production to its custom
// domain (www.temur.app) instead of Vercel's own *.vercel.app hostname.
// Every other deployment — most importantly a PR's Preview build, which has
// no custom domain and a different URL every time — resolves itself
// automatically via Vercel's system environment variables (populated on
// every deployment with no configuration needed), so emailed links (auth
// confirmation, password reset) work out of the box on a preview instead of
// silently pointing at http://localhost:3000.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return 'http://localhost:3000';
}
