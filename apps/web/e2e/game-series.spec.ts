import { test, expect } from '@playwright/test';
import { primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

const pad = (n: number) => String(n).padStart(2, '0');
const datetimeLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

test.describe('Recurring game blocks', () => {
  test('schedules a weekly block, edits it, then cancels the upcoming games', async ({ page }) => {
    const groupName = `E2E Series ${Date.now()}`;
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill(groupName);
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/([0-9a-f-]+)$/);
    const groupId = new URL(page.url()).pathname.split('/').pop()!;

    // First kickoff 8 days out, weekly, for 4 more weeks → 5 games.
    const first = new Date();
    first.setDate(first.getDate() + 8);
    first.setHours(19, 0, 0, 0);
    const until = new Date(first);
    until.setDate(until.getDate() + 28);

    await page.goto(`/groups/${groupId}/series/new`);
    await page.getByLabel('First Kickoff').fill(datetimeLocal(first));
    await page.getByLabel('Until').fill(dateInput(until));
    await page.getByLabel('Team 1 Name').fill('E2E Reds');
    await page.getByLabel('Team 2 Name').fill('E2E Blues');
    await expect(page.getByText('Creates 5 games')).toBeVisible();
    await page.getByRole('button', { name: 'Schedule Games' }).click();

    await page.waitForURL(`**/groups/${groupId}/games`);
    const gameLinks = page.locator('a[href^="/games/"]');
    await expect(gameLinks).toHaveCount(5);
    await expect(page.getByText('E2E Reds vs E2E Blues').first()).toBeVisible();

    // Edit the whole block — rename team 1.
    await gameLinks.first().click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);
    await page.getByRole('link', { name: 'Edit upcoming games in this block' }).click();
    await page.waitForURL(new RegExp(`/groups/${groupId}/series/[0-9a-f-]+/edit$`));
    await page.getByLabel('Team 1 Name').fill('E2E Greens');
    await page.getByRole('button', { name: 'Save Changes to Block' }).click();

    await page.waitForURL(`**/groups/${groupId}/games`);
    await expect(page.getByText('E2E Greens vs E2E Blues').first()).toBeVisible();
    await expect(page.getByText('E2E Reds vs E2E Blues')).toHaveCount(0);

    // Cancel the block.
    await page.locator('a[href^="/games/"]').first().click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancel upcoming games in this block' }).click();

    await page.waitForURL(`**/groups/${groupId}/games`);
    await expect(page.locator('a[href^="/games/"]')).toHaveCount(0);
    await expect(page.getByText("This group doesn't have any games scheduled yet.")).toBeVisible();
  });
});
