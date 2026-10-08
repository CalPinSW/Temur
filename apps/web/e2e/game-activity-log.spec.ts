import { test, expect } from '@playwright/test';
import { createGroupAndGame, E2E_USERS, primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Game activity log', () => {
  test('records a signup and a withdrawal for the game admin to see', async ({ page }) => {
    await createGroupAndGame(page, 'E2E Activity');
    const gameUrl = page.url();

    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByRole('button', { name: 'Withdraw' })).toBeVisible();
    await page.getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();

    await page.getByRole('link', { name: 'Activity Log' }).click();
    await page.waitForURL(`${gameUrl}/activity`);
    await expect(page.getByRole('heading', { name: 'Activity Log' })).toBeVisible();

    const entries = page.getByRole('main').getByRole('listitem');
    await expect(entries).toHaveCount(2);
    await expect(entries.nth(0)).toContainText(`${E2E_USERS.primary.displayName} withdrew`);
    await expect(entries.nth(1)).toContainText(`${E2E_USERS.primary.displayName} signed up`);
  });
});
