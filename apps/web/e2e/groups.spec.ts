import { test, expect } from '@playwright/test';
import { E2E_USERS, primaryStorageState, secondaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Groups', () => {
  // Computed once via beforeAll, not as a plain describe-body const — the
  // latter isn't reliably re-used across tests (each test can re-evaluate
  // the describe body), so later tests ended up referencing a group name
  // that was never actually created.
  let groupName: string;
  test.beforeAll(() => {
    groupName = `E2E Group ${Date.now()}`;
  });

  test('creates a group', async ({ page }) => {
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill(groupName);
    await page.getByRole('button', { name: 'Create Group' }).click();

    await page.waitForURL(/\/groups\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: groupName })).toBeVisible();
    await expect(page.getByText('1 member')).toBeVisible();
  });

  test('edits the group description', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Description').fill('An E2E test group');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('An E2E test group')).toBeVisible();
  });

  test('creates a group-scoped game via the group detail page', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    await page.getByRole('link', { name: 'Create Game' }).click();

    // Scoped to main: Next's route-announcer live region can transiently
    // echo the same text right after a navigation, causing a strict-mode
    // "resolved to 2 elements" failure on an unscoped getByText.
    await expect(page.getByRole('main').getByText(groupName)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Friends' })).not.toBeVisible();
    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);
  });

  test('invites a second user who accepts, then gets promoted, demoted, and removed', async ({
    page,
    browser,
  }) => {
    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    await page.getByRole('link', { name: 'Invite Player' }).click();

    await page.getByPlaceholder('Search by username or name...').fill(E2E_USERS.secondary.username);
    await expect(page.getByText(E2E_USERS.secondary.displayName)).toBeVisible();
    await page.getByRole('button', { name: 'Invite' }).click();
    await expect(page.getByRole('button', { name: 'Sent' })).toBeVisible();

    const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
    const secondaryPage = await secondaryContext.newPage();
    try {
      await secondaryPage.goto('/groups/invites');
      await expect(secondaryPage.getByRole('main').getByText(groupName)).toBeVisible();
      await secondaryPage.getByRole('button', { name: 'Accept' }).click();
      await expect(secondaryPage.getByRole('main').getByText(groupName)).not.toBeVisible();
    } finally {
      await secondaryContext.close();
    }

    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    await expect(page.getByText('2 members')).toBeVisible();
    await page.getByRole('link', { name: 'View Members' }).click();
    await expect(page.getByText(E2E_USERS.secondary.displayName)).toBeVisible();

    const memberRow = page.locator('div.px-4.py-3', { hasText: E2E_USERS.secondary.displayName });
    await memberRow.getByRole('button', { name: 'Promote' }).click();
    await expect(memberRow.getByRole('button', { name: 'Demote' })).toBeVisible();
    await memberRow.getByRole('button', { name: 'Demote' }).click();
    await expect(memberRow.getByRole('button', { name: 'Promote' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await memberRow.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText(E2E_USERS.secondary.displayName)).not.toBeVisible();
  });

  test('leaves the group', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Leave Group' }).click();
    await page.waitForURL('**/groups');
    await expect(page.getByRole('link', { name: groupName })).not.toBeVisible();
  });
});
