import path from 'node:path';
import type { Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AUTH_DIR, E2E_USERS, getLocalSupabaseStatus } from './global-setup';

export const primaryStorageState = path.join(AUTH_DIR, 'primary.json');
export const secondaryStorageState = path.join(AUTH_DIR, 'secondary.json');

export { E2E_USERS };

let adminClient: SupabaseClient | null = null;

// Lazily built (rather than at module load like global-setup's) since only
// the specs that actually need admin-level access — password recovery,
// which can't be driven any other way because Playwright can't read a real
// inbox — pay for the `supabase status` shell-out.
function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const status = getLocalSupabaseStatus();
    adminClient = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

// Generates a real recovery action_link server-side via the admin API,
// standing in for "the user clicked the link in their email" — the same
// technique global-setup uses to avoid needing a real inbox.
export async function generatePasswordRecoveryLink(
  email: string,
  redirectTo: string
): Promise<string> {
  const { data, error } = await getAdminClient().auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    throw new Error(`Failed to generate recovery link for ${email}: ${error?.message}`);
  }

  return data.properties.action_link;
}

// A throwaway account for tests that need to mutate a real password —
// keeps that mutation off E2E_USERS.primary/secondary, which other specs
// log in with directly (not just via storageState) and would break if
// their password changed underneath them.
export async function createDisposableUser(
  emailPrefix: string
): Promise<{ email: string; userId: string }> {
  const email = `${emailPrefix}-${Date.now()}@example.com`;
  const { data, error } = await getAdminClient().auth.admin.createUser({
    email,
    password: `${emailPrefix}-initial-password`,
    email_confirm: true,
  });

  if (error || !data?.user) {
    throw new Error(`Failed to create disposable user ${email}: ${error?.message}`);
  }

  return { email, userId: data.user.id };
}

export async function deleteUser(userId: string): Promise<void> {
  await getAdminClient().auth.admin.deleteUser(userId);
}

// Creates a fresh group (the signed-in page's user becomes its admin) and a
// game scoped to it, via the real UI. Returns the group id and the game's
// team names so callers can navigate straight to either. Kickoff/visible-at
// dates are left at their defaults (next Saturday) unless overridden.
export async function createGroupAndGame(
  page: Page,
  namePrefix: string,
  options: { kickoffDate?: string } = {}
): Promise<{ groupId: string; team1: string; team2: string }> {
  const groupName = `${namePrefix} Group ${Date.now()}`;

  await page.goto('/groups/new');
  await page.getByLabel('Group Name').fill(groupName);
  await page.getByRole('button', { name: 'Create Group' }).click();
  await page.waitForURL(/\/groups\/([0-9a-f-]+)$/);
  const groupId = new URL(page.url()).pathname.split('/').pop()!;

  const team1 = `${namePrefix}-T1-${Date.now()}`;
  const team2 = `${namePrefix}-T2-${Date.now()}`;

  await page.goto(`/games/new?group=${groupId}`);
  if (options.kickoffDate) {
    await page.getByLabel('Kickoff Date & Time').fill(options.kickoffDate);
  }
  await page.getByLabel('Team 1 Name').fill(team1);
  await page.getByLabel('Team 2 Name').fill(team2);
  await page.getByRole('button', { name: 'Create Game' }).click();
  await page.waitForURL(/\/games\/[0-9a-f-]+$/);

  return { groupId, team1, team2 };
}
