import { test, expect } from '@playwright/test';
import { E2E_USERS, primaryStorageState, secondaryStorageState, createGroupAndGame } from './helpers';

test.use({ storageState: primaryStorageState });

// These exercise the nav badge counts live-updating via Supabase realtime
// (postgres_changes), not just on navigation/reload — the thing that
// previously silently didn't work at all (see the realtime-publication
// migration) since no table was ever added to the supabase_realtime
// publication.
test.describe('Realtime nav badges', () => {
  test('shows a live friend-request badge without reloading, then clears it on accept', async ({
    page,
    browser,
  }) => {
    const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
    const secondaryPage = await secondaryContext.newPage();
    try {
      await secondaryPage.goto('/games');
      const friendsBadge = secondaryPage.getByRole('link', { name: 'Friends' });
      await expect(friendsBadge.getByText('1')).not.toBeVisible();

      await page.goto('/friends/search');
      await page
        .getByPlaceholder('Search by username or name...')
        .fill(E2E_USERS.secondary.username);
      const resultRow = page.locator('div.px-4.py-3', { hasText: E2E_USERS.secondary.displayName });
      await resultRow.getByRole('button', { name: 'Add' }).click();
      await expect(resultRow.getByRole('button', { name: 'Sent' })).toBeVisible();

      // secondaryPage never navigates or reloads — the badge must update
      // purely from the realtime subscription picking up the INSERT.
      await expect(friendsBadge.getByText('1')).toBeVisible();

      await secondaryPage.goto('/friends/requests');
      const requestRow = secondaryPage.locator('div.px-4.py-3', {
        hasText: E2E_USERS.primary.displayName,
      });
      await expect(requestRow).toBeVisible();
      await requestRow.getByRole('button', { name: 'Accept' }).click();
      await expect(requestRow).not.toBeVisible();
      await expect(secondaryPage.getByRole('link', { name: 'Friends' }).getByText('1')).not.toBeVisible();
    } finally {
      await secondaryContext.close();

      page.once('dialog', (dialog) => dialog.accept());
      await page.goto('/friends');
      const friendRow = page.locator('div.px-4.py-3', { hasText: E2E_USERS.secondary.displayName });
      await friendRow.getByRole('button', { name: `Remove ${E2E_USERS.secondary.displayName}` }).click();
      await expect(friendRow).not.toBeVisible();
    }
  });

  test('shows a live group-invite badge without reloading, then clears it on accept', async ({
    page,
    browser,
  }) => {
    const { groupId } = await createGroupAndGame(page, 'Realtime');

    const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
    const secondaryPage = await secondaryContext.newPage();
    try {
      await secondaryPage.goto('/games');
      const groupsBadge = secondaryPage.getByRole('link', { name: 'Groups' });
      await expect(groupsBadge.getByText('1')).not.toBeVisible();

      await page.goto(`/groups/${groupId}/invite`);
      await page
        .getByPlaceholder('Search by username or name...')
        .fill(E2E_USERS.secondary.username);
      await expect(page.getByText(E2E_USERS.secondary.displayName)).toBeVisible();
      await page.getByRole('button', { name: 'Invite' }).click();
      await expect(page.getByRole('button', { name: 'Sent' })).toBeVisible();

      // secondaryPage never navigates or reloads here either.
      await expect(groupsBadge.getByText('1')).toBeVisible();

      await secondaryPage.goto('/groups/invites');
      await secondaryPage.getByRole('button', { name: 'Accept' }).click();
      await expect(secondaryPage.getByRole('link', { name: 'Groups' }).getByText('1')).not.toBeVisible();
    } finally {
      await secondaryContext.close();
    }
  });
});
