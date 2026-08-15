import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

interface LocalSupabaseStatus {
  API_URL: string;
  SERVICE_ROLE_KEY: string;
}

const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)/;

function getLocalSupabaseStatus(): LocalSupabaseStatus {
  const repoRoot = path.resolve(__dirname, '../../..');
  const output = execSync('supabase status -o json', { cwd: repoRoot, encoding: 'utf-8' });
  return JSON.parse(output);
}

export const E2E_USERS = {
  primary: {
    email: 'e2e-primary@example.com',
    password: 'e2e-test-password-123',
    username: 'e2eprimary',
    displayName: 'E2E Primary',
  },
  secondary: {
    email: 'e2e-secondary@example.com',
    password: 'e2e-test-password-123',
    username: 'e2esecondary',
    displayName: 'E2E Secondary',
  },
} as const;

export const AUTH_DIR = path.join(__dirname, '.auth');

// Creates deterministic, freshly-reset E2E test users directly against the
// LOCAL Supabase stack, then logs each in through the real UI once and
// saves its cookie storageState for other tests to reuse via
// `test.use({ storageState: ... })`. Never touches a real project — the
// URL guards below are load-bearing, not decorative.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
  if (!LOCAL_URL_PATTERN.test(baseURL)) {
    throw new Error(
      `Refusing to run E2E global setup against non-local baseURL "${baseURL}". These tests create and delete real auth users and must only run against the local Supabase stack (run \`supabase start\` first).`
    );
  }

  const status = getLocalSupabaseStatus();
  if (!LOCAL_URL_PATTERN.test(status.API_URL)) {
    throw new Error(`Refusing to run against non-local Supabase project: ${status.API_URL}`);
  }

  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    // supabase-js always constructs a RealtimeClient, which needs a
    // WebSocket global — present on Node 22+ but not on Node 20 (this
    // repo's pinned version, per .nvmrc / CI). Provide one explicitly so
    // this works on the project's actual baseline, not just newer local
    // Node installs.
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });

  const { data: existing, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw new Error(`Failed to list existing users: ${listError.message}`);

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  for (const user of Object.values(E2E_USERS)) {
    const match = existing.users.find((u) => u.email === user.email);
    if (match) {
      // player_games' ringer-shape check requires added_by IS NOT NULL for
      // ringer rows, but its FK is ON DELETE SET NULL — deleting a user who
      // ever added a ringer via a previous run otherwise fails with a
      // generic "Database error deleting user". Clear those rows first.
      // (This is a real product bug, tracked separately — not specific to
      // these tests.)
      await admin.from('player_games').delete().eq('added_by', match.id).eq('is_ringer', true);

      const { error } = await admin.auth.admin.deleteUser(match.id);
      if (error) throw new Error(`Failed to delete stale E2E user ${user.email}: ${error.message}`);
    }

    const { error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { username: user.username, display_name: user.displayName },
    });
    if (error) throw new Error(`Failed to create E2E user ${user.email}: ${error.message}`);
  }

  const browser = await chromium.launch();
  try {
    for (const [key, user] of Object.entries(E2E_USERS)) {
      const page = await browser.newPage({ baseURL });
      await page.goto('/login');
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Password').fill(user.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL('**/games');
      await page.context().storageState({ path: path.join(AUTH_DIR, `${key}.json`) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
