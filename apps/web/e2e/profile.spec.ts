import { test, expect } from '@playwright/test';
import { E2E_USERS, primaryStorageState, createDisposableUser, deleteUser } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Profile', () => {
  test('views the profile page', async ({ page }) => {
    await page.goto('/profile');
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

  test('switches appearance and restores it to system', async ({ page }) => {
    await page.goto('/profile');

    await page.getByRole('button', { name: 'Dark' }).click();
    await expect(page.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // The cookie-backed preference should survive a reload, not just the
    // in-memory client state.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'System' }).click();
    await expect(page.getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  });

  test('toggles a notification preference and select-all, persisting after reload', async ({
    page,
  }) => {
    await page.goto('/profile/notifications');

    const friendRequestEmail = page.getByLabel('Friend requests — Email');
    const friendRequestPush = page.getByLabel('Friend requests — Push');
    const selectAllEmail = page.getByLabel('Select all Email');

    await expect(friendRequestEmail).toBeChecked();
    await expect(selectAllEmail).toBeChecked();

    // Flip a single cell — its column's "select all" should reflect the
    // resulting mixed state, and untouched cells stay put.
    await friendRequestEmail.uncheck();
    await expect(friendRequestEmail).not.toBeChecked();
    await expect(selectAllEmail).not.toBeChecked();
    await expect(friendRequestPush).toBeChecked();

    // The DB write persists across a reload, not just in-memory state.
    // Wait for the upsert's transition to settle (inputs re-enable) before
    // reloading, otherwise the reload can race the in-flight Server Action.
    await expect(friendRequestEmail).toBeEnabled();
    await page.reload();
    await expect(friendRequestEmail).not.toBeChecked();

    // Select-all restores every row in that column at once.
    await selectAllEmail.check();
    await expect(friendRequestEmail).toBeChecked();
    await expect(page.getByLabel('New games available — Email')).toBeChecked();
  });

  test('views the about page', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('link', { name: 'About' }).click();
    await page.waitForURL('**/profile/about');

    await expect(page.getByRole('main').getByText('Temur', { exact: true })).toBeVisible();
    await expect(page.getByText('Version')).toBeVisible();
  });
});

test.describe('Account deletion', () => {
  // Starts unauthenticated (overriding the file-level primaryStorageState
  // above) since this test signs in as its own disposable user rather than
  // reusing the shared primary/secondary accounts — there's no "restore
  // afterward" for a deleted account the way the password test above
  // restores the password it temporarily changed.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deletes the account, signing the user out and preventing further sign-in', async ({
    page,
  }) => {
    const password = 'delete-account-e2e-initial-password';
    const { email, userId } = await createDisposableUser('delete-account-e2e');

    try {
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL('**/games');

      await page.goto('/profile/delete-account');
      await page.getByLabel(/Type ".*" or your email to confirm/).fill(email);

      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Permanently Delete Account' }).click();
      await page.waitForURL('**/login');

      // Black-box confirmation the account is really gone, rather than
      // reaching into admin internals: the same credentials that just
      // signed in successfully above no longer authenticate at all.
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByText('Incorrect email or password.')).toBeVisible();
    } finally {
      await deleteUser(userId);
    }
  });
});
