import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ['@temur/shared'],
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
