import path from 'node:path';
import type { Page } from '@playwright/test';
import { AUTH_DIR, E2E_USERS, getLocalSupabaseStatus } from './global-setup';

export const primaryStorageState = path.join(AUTH_DIR, 'primary.json');
export const secondaryStorageState = path.join(AUTH_DIR, 'secondary.json');

export { E2E_USERS, getLocalSupabaseStatus };

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
