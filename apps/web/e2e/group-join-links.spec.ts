import { test, expect } from '@playwright/test';
import { primaryStorageState, secondaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Group join links', () => {
  test('a shared join link adds another signed-in user to the group', async ({
    page,
    browser,
  }) => {
    const groupName = `E2E Join Link Group ${Date.now()}`;

    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill(groupName);
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[0-9a-f-]+$/);

    await page.getByRole('link', { name: 'Invite Player' }).click();
    await page.getByRole('button', { name: 'Get Join Link' }).click();
    const linkText = await page.getByText(/\/groups\/join\//).textContent();
    const joinUrl = new URL(linkText!.trim());

    const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
    const secondaryPage = await secondaryContext.newPage();
    try {
      await secondaryPage.goto(joinUrl.pathname);
      await secondaryPage.waitForURL(/\/groups\/[0-9a-f-]+$/);
      await expect(secondaryPage.getByRole('heading', { name: groupName })).toBeVisible();
      await expect(secondaryPage.getByText('2 members')).toBeVisible();
    } finally {
      await secondaryContext.close();
    }
  });

  test('an invalid join link shows an error message instead of joining', async ({ page }) => {
    await page.goto('/groups/join/not-a-real-token');
    await expect(page.getByRole('heading', { name: 'Link invalid or expired' })).toBeVisible();
  });
});
