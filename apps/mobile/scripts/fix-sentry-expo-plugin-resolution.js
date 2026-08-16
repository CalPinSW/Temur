#!/usr/bin/env node
// npm workspaces hoists @sentry/react-native to the repo root node_modules,
// but `expo` only ever installs inside apps/mobile/node_modules (it's never
// hoisted). The @sentry/react-native/expo config plugin does its own
// require('expo/config-plugins') from wherever its files physically live,
// so once hoisted it can never see apps/mobile's local `expo` package —
// Node's resolution walk never reaches it. A symlink doesn't fix this
// either, since Node resolves symlinks to their real path before walking
// up for node_modules. The only fix is a real, non-hoisted copy here.
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', '@sentry', 'react-native');

let source;
try {
  source = path.dirname(require.resolve('@sentry/react-native/package.json'));
} catch {
  console.warn('[fix-sentry-expo-plugin-resolution] @sentry/react-native not resolvable, skipping.');
  process.exit(0);
}

if (path.resolve(source) === path.resolve(target)) {
  // Already local (npm didn't hoist it this time) — nothing to do.
  process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });
console.log('[fix-sentry-expo-plugin-resolution] Copied @sentry/react-native into apps/mobile/node_modules.');
