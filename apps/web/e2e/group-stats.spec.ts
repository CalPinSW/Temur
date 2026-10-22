import { test, expect } from '@playwright/test';
import {
  backdateGameToPast,
  createGroupAndGame,
  E2E_USERS,
  primaryStorageState,
  setPlayedGameOutcome,
} from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Group stats', () => {
  test('a group admin sees a played game reflected in the stats page', async ({ page }) => {
    const { groupId } = await createGroupAndGame(page, 'E2E Stats');
    const gameId = new URL(page.url()).pathname.split('/').pop()!;

    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByRole('button', { name: 'Withdraw' })).toBeVisible();

    await setPlayedGameOutcome(gameId, 3, 1);
    await backdateGameToPast(gameId);

    await page.goto(`/groups/${groupId}`);
    await page.getByRole('link', { name: 'Player Stats' }).click();
    await page.waitForURL(`/groups/${groupId}/stats`);
    await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible();

    const playerRow = page
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: E2E_USERS.primary.displayName }) });
    await expect(playerRow).toContainText('1-0-0');
    await expect(playerRow).toContainText('100%');
    await expect(playerRow).toContainText('+2.0');

    await page.getByRole('link', { name: 'Last 3 months' }).click();
    await page.waitForURL(`/groups/${groupId}/stats?range=90d`);
    await expect(playerRow).toContainText('1-0-0');
  });
});
