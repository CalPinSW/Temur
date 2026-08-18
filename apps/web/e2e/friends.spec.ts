import { test, expect } from '@playwright/test';
import { E2E_USERS, primaryStorageState, secondaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Friends', () => {
  test('sends a friend request that the recipient can accept, then primary removes it', async ({
    page,
    browser,
  }) => {
    await page.goto('/friends/search');
    await page.getByPlaceholder('Search by username or name...').fill(E2E_USERS.secondary.username);
    const resultRow = page.locator('div.px-4.py-3', { hasText: E2E_USERS.secondary.displayName });
    await expect(resultRow).toBeVisible();
    await resultRow.getByRole('button', { name: 'Add' }).click();
    await expect(resultRow.getByRole('button', { name: 'Sent' })).toBeVisible();

    const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
    const secondaryPage = await secondaryContext.newPage();
    try {
      await secondaryPage.goto('/friends/requests');
      const requestRow = secondaryPage.locator('div.px-4.py-3', {
        hasText: E2E_USERS.primary.displayName,
      });
      await expect(requestRow).toBeVisible();
      await requestRow.getByRole('button', { name: 'Accept' }).click();
      await expect(requestRow).not.toBeVisible();

      await secondaryPage.goto('/friends');
      await expect(
        secondaryPage.locator('div.px-4.py-3', { hasText: E2E_USERS.primary.displayName })
      ).toBeVisible();
    } finally {
      await secondaryContext.close();
    }

    await page.goto('/friends');
    const friendRow = page.locator('div.px-4.py-3', { hasText: E2E_USERS.secondary.displayName });
    await expect(friendRow).toBeVisible();

    // The bug this guards against: primary never took any action after
    // sending the request, so if search still offered "Add" here it would
    // mean primary has to re-add secondary even though secondary already
    // accepted — searchUsers must reflect the accepted friendship, not just
    // locally-tracked "sent" state.
    await page.goto('/friends/search');
    await page.getByPlaceholder('Search by username or name...').fill(E2E_USERS.secondary.username);
    const searchRow = page.locator('div.px-4.py-3', { hasText: E2E_USERS.secondary.displayName });
    await expect(searchRow.getByRole('button', { name: 'Friends' })).toBeVisible();
    await expect(searchRow.getByRole('button', { name: 'Friends' })).toBeDisabled();

    await page.goto('/friends');
    page.once('dialog', (dialog) => dialog.accept());
    await friendRow.getByRole('button', { name: `Remove ${E2E_USERS.secondary.displayName}` }).click();
    await expect(friendRow).not.toBeVisible();
  });
});
