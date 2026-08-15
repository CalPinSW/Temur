import { test, expect } from '@playwright/test';
import { E2E_USERS, primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Profile', () => {
  test('views the profile page', async ({ page }) => {
    await page.goto('/profile');
    // The display name also appears in the nav link — scope to the page
    // body so this doesn't hit a strict-mode "resolved to 2 elements".
    await expect(page.getByRole('main').getByText(E2E_USERS.primary.displayName)).toBeVisible();
    await expect(page.getByText(`@${E2E_USERS.primary.username}`)).toBeVisible();
  });

  test('edits and restores the display name', async ({ page }) => {
    await page.goto('/profile/edit');
    const tempName = `Temp Name ${Date.now()}`;

    await page.getByLabel('Display name').fill(tempName);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForURL('**/profile');
    await expect(page.getByRole('main').getByText(tempName)).toBeVisible();

    await page.goto('/profile/edit');
    await page.getByLabel('Display name').fill(E2E_USERS.primary.displayName);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForURL('**/profile');
    await expect(page.getByRole('main').getByText(E2E_USERS.primary.displayName)).toBeVisible();
  });

  test('changes and restores the password', async ({ page }) => {
    const tempPassword = 'temp-password-456';

    await page.goto('/profile/change-password');
    await page.getByLabel('New Password').fill(tempPassword);
    await page.getByLabel('Confirm Password').fill(tempPassword);
    await page.getByRole('button', { name: 'Change Password' }).click();
    await page.waitForURL('**/profile');

    await page.goto('/profile/change-password');
    await page.getByLabel('New Password').fill(E2E_USERS.primary.password);
    await page.getByLabel('Confirm Password').fill(E2E_USERS.primary.password);
    await page.getByRole('button', { name: 'Change Password' }).click();
    await page.waitForURL('**/profile');
  });
});
