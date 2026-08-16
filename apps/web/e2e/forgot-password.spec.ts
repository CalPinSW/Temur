import { test, expect } from '@playwright/test';
import { E2E_USERS, createDisposableUser, deleteUser, generatePasswordRecoveryLink } from './helpers';

test.describe('Forgot / reset password', () => {
  test('shows a confirmation after requesting a reset email', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await page.waitForURL('**/forgot-password');

    await page.getByLabel('Email').fill(E2E_USERS.primary.email);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    await expect(page.getByText(/Check your email/i)).toBeVisible();
  });

  test('redirects an unauthenticated visit to /reset-password back to /login', async ({ page }) => {
    await page.goto('/reset-password');
    await page.waitForURL('**/login');
  });

  test('sets a new password via the recovery link and signs in with it', async ({
    page,
    baseURL,
  }) => {
    const { email, userId } = await createDisposableUser('e2e-reset');
    const newPassword = `reset-${Date.now()}`;

    try {
      const actionLink = await generatePasswordRecoveryLink(email, `${baseURL}/reset-password`);

      await page.goto(actionLink);
      await page.waitForURL('**/reset-password');

      await page.getByLabel('New Password').fill(newPassword);
      await page.getByLabel('Confirm Password').fill(newPassword);
      await page.getByRole('button', { name: 'Set New Password' }).click();
      await page.waitForURL('**/games');

      await page.getByRole('button', { name: 'Sign out' }).click();
      await page.waitForURL('**/login');

      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(newPassword);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL('**/games');
      await expect(page.getByRole('heading', { name: 'Games', level: 1 })).toBeVisible();
    } finally {
      await deleteUser(userId);
    }
  });
});
