import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ['@temur/shared'],
  experimental: {
    serverActions: {
      // Server Actions default to a 1MB body limit, well under
      // MAX_AVATAR_SIZE_BYTES (5MB) — an avatar upload past 1MB was
      // rejected at the framework level before our own size validation
      // in updateProfile ever ran, surfacing as an uncaught 500 instead
      // of the curated error message. Sized with headroom over the 5MB
      // file limit for multipart overhead and the other form fields.
      bodySizeLimit: '6mb',
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: "softwire-zd",
  project: "temur-web",
  // No SENTRY_AUTH_TOKEN configured yet — the plugin skips source map
  // upload gracefully rather than failing the build; stack traces show
  // minified code until it's added (see README's Sentry setup section).
  silent: true,
  widenClientFileUpload: true,
});
