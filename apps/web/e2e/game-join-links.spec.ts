import { test, expect } from '@playwright/test';
import { primaryStorageState, secondaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Game join links', () => {
  test('a shared join link gives another signed-in user access to the game', async ({
    page,
    browser,
  }) => {
    const suffix = Date.now();
    const team1 = `E2E-Join-T1-${suffix}`;
    const team2 = `E2E-Join-T2-${suffix}`;

    await page.goto('/games/new');
    const recentPast = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 16);
    await page.getByLabel('Visible From').fill(recentPast);
    await page.getByLabel('Team 1 Name').fill(team1);
    await page.getByLabel('Team 2 Name').fill(team2);
    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);

    await page.getByRole('button', { name: 'Get Join Link' }).click();
    const linkText = await page.getByText(/\/games\/join\//).textContent();
    const joinUrl = new URL(linkText!.trim());

    const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
    const secondaryPage = await secondaryContext.newPage();
    try {
      await secondaryPage.goto(joinUrl.pathname);
      await secondaryPage.waitForURL(/\/games\/[0-9a-f-]+$/);
      await expect(
        secondaryPage.getByRole('heading', { name: `${team1} vs ${team2}` })
      ).toBeVisible();
      await expect(secondaryPage.getByRole('button', { name: 'Sign up' })).toBeVisible();
    } finally {
      await secondaryContext.close();
    }
  });

  test('an invalid join link shows an error message instead of joining', async ({ page }) => {
    await page.goto('/games/join/not-a-real-token');
    await expect(page.getByRole('heading', { name: 'Link invalid or expired' })).toBeVisible();
  });
});
