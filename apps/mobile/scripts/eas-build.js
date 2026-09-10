#!/usr/bin/env node
// Wrapper around `eas build` that drops the finished artifact into
// apps/mobile/builds/ (gitignored) with a predictable name:
//
//   temur-<appVersion>-<buildNumber>-<platform>-<profile>[-local].<ext>
//
// `appVersion` comes from app.json; `buildNumber` is the value EAS
// auto-increments (autoIncrement is enabled for every profile in eas.json),
// so cloud-build filenames never collide.
//
//   node scripts/eas-build.js --platform ios --profile preview
//   node scripts/eas-build.js --platform android --profile preview --local
//
// Default: build on EAS servers, then download the artifact.
// --local:  compile on this machine via `eas build --local` instead (needs
//           the full native toolchain; the remote build number isn't bumped
//           so repeated local builds overwrite the same file).

const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync, readFileSync } = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const buildsDir = path.join(mobileRoot, 'builds');

const argv = process.argv.slice(2);
const flagValue = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
};
const hasFlag = (name) => argv.includes(`--${name}`);

const platform = flagValue('platform');
const profile = flagValue('profile');
const local = hasFlag('local');

if (!profile || !['ios', 'android'].includes(platform)) {
  console.error(
    'Usage: node scripts/eas-build.js --platform <ios|android> --profile <name> [--local]'
  );
  process.exit(1);
}

const appVersion = JSON.parse(readFileSync(path.join(mobileRoot, 'app.json'), 'utf8')).expo.version;
const easConfig = JSON.parse(readFileSync(path.join(mobileRoot, 'eas.json'), 'utf8'));
const androidBuildType = easConfig.build?.[profile]?.android?.buildType ?? 'apk';
const defaultExt =
  platform === 'ios' ? '.ipa' : androidBuildType === 'app-bundle' ? '.aab' : '.apk';

function eas(args, { capture = false } = {}) {
  const res = spawnSync('npx', ['eas', ...args], {
    cwd: mobileRoot,
    encoding: 'utf8',
    // In --json mode eas-cli sends progress to stderr, so the user still
    // sees it while we capture the JSON from stdout.
    stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
  return res.stdout ?? '';
}

const parseJson = (stdout) => JSON.parse(stdout.slice(stdout.search(/[[{]/)));

function outputPath(buildNumber, ext) {
  const suffix = local ? '-local' : '';
  return path.join(
    buildsDir,
    `temur-${appVersion}-${buildNumber}-${platform}-${profile}${suffix}${ext}`
  );
}

async function runLocal() {
  const version = parseJson(
    eas(['build:version:get', '-p', platform, '-e', profile, '--json', '--non-interactive'], {
      capture: true,
    })
  );
  const buildNumber = version.buildNumber ?? version.versionCode ?? 'local';
  const out = outputPath(buildNumber, defaultExt);
  eas(['build', '-p', platform, '-e', profile, '--local', '--output', out, '--non-interactive']);
  console.log(`\nBuilt → ${path.relative(process.cwd(), out)}`);
}

async function runRemote() {
  const builds = parseJson(
    eas(['build', '-p', platform, '-e', profile, '--wait', '--json', '--non-interactive'], {
      capture: true,
    })
  );
  const record = Array.isArray(builds) ? builds[0] : builds;
  const url = record.artifacts?.applicationArchiveUrl ?? record.artifacts?.buildUrl;
  if (!url) {
    console.error('Build finished but no artifact URL was returned.');
    process.exit(1);
  }
  const ext = path.extname(new URL(url).pathname) || defaultExt;
  const out = outputPath(record.appBuildVersion, ext);

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to download artifact: HTTP ${res.status}`);
    process.exit(1);
  }
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));

  writeFileSync(
    out.replace(/\.[^.]+$/, '.json'),
    JSON.stringify(
      {
        buildId: record.id,
        gitCommitHash: record.gitCommitHash,
        appVersion: record.appVersion,
        buildNumber: record.appBuildVersion,
        platform,
        profile,
        artifactUrl: url,
        downloadedAt: new Date().toISOString(),
      },
      null,
      2
    ) + '\n'
  );
  console.log(`\nDownloaded → ${path.relative(process.cwd(), out)}`);
}

mkdirSync(buildsDir, { recursive: true });
(local ? runLocal() : runRemote()).catch((error) => {
  console.error(error);
  process.exit(1);
});
