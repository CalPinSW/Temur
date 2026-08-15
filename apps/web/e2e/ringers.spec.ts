import { test, expect } from '@playwright/test';
import { createGroupAndGame, primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Ringers', () => {
  test('opens a game to ringers, adds one, then removes it', async ({ page }) => {
    const { team1, team2 } = await createGroupAndGame(page, 'E2E Ringers');
    await expect(page.getByRole('heading', { name: `${team1} vs ${team2}` })).toBeVisible();

    await page.getByRole('button', { name: 'Open to Ringers' }).click();
    await page.getByRole('button', { name: 'Send Notifications' }).click();
    await expect(page.getByText('Open to ringers')).toBeVisible();

    await page.getByRole('button', { name: 'Add a Ringer' }).click();
    await page.getByPlaceholder('e.g. Alex Smith').fill('E2E Guest');
    await page.getByRole('button', { name: 'Add Ringer' }).click();

    const ringerRow = page.locator('li', { hasText: 'E2E Guest' });
    await expect(ringerRow).toBeVisible();
    await expect(ringerRow.getByText('Ringer')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await ringerRow.getByRole('button', { name: 'Remove E2E Guest' }).click();
    await expect(ringerRow).not.toBeVisible();
  });

  test('saves a ringer name for later re-use across games', async ({ page }) => {
    const { team1, team2 } = await createGroupAndGame(page, 'E2E SavedRingers');
    await expect(page.getByRole('heading', { name: `${team1} vs ${team2}` })).toBeVisible();

    await page.getByRole('button', { name: 'Open to Ringers' }).click();
    await page.getByRole('button', { name: 'Send Notifications' }).click();
    await page.getByRole('button', { name: 'Add a Ringer' }).click();
    await page.getByPlaceholder('e.g. Alex Smith').fill('E2E Saved Guest');
    await page.getByRole('button', { name: 'Add Ringer' }).click();
    await expect(page.locator('li', { hasText: 'E2E Saved Guest' })).toBeVisible();

    await page.goto('/friends/ringers');
    const savedRow = page.locator('div.px-4.py-3', { hasText: 'E2E Saved Guest' });
    await expect(savedRow).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await savedRow.getByRole('button', { name: 'Remove E2E Saved Guest' }).click();
    await expect(page.getByText('E2E Saved Guest')).not.toBeVisible();
  });
});
