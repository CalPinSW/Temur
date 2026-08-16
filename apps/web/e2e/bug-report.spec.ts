import { test, expect } from '@playwright/test';
import { primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Bug report', () => {
  test('submits a bug report from the profile page', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('link', { name: 'Report a Bug' }).click();
    await page.waitForURL('**/profile/report-bug');

    await page
      .getByLabel('What happened?')
      .fill(`E2E test bug report ${Date.now()} — the sign-up button did nothing.`);
    await page.getByRole('button', { name: 'Send Report' }).click();

    await expect(page.getByText('Thanks — your report has been sent to support.')).toBeVisible();
  });
});
