import { test, expect } from '@playwright/test';
import { createGroupAndGame, primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

const pad = (n: number) => String(n).padStart(2, '0');

test.describe('Group calendar', () => {
  test('shows a group game on its day and links through to the game', async ({ page }) => {
    // Kickoff two days out, at a fixed time, so it lands on a known day.
    const kickoff = new Date();
    kickoff.setDate(kickoff.getDate() + 2);
    kickoff.setHours(19, 0, 0, 0);
    const kickoffLocal = `${kickoff.getFullYear()}-${pad(kickoff.getMonth() + 1)}-${pad(
      kickoff.getDate()
    )}T19:00`;

    const { groupId, team1, team2 } = await createGroupAndGame(page, 'E2E Calendar', {
      kickoffDate: kickoffLocal,
    });

    await page.goto(`/groups/${groupId}/calendar`);
    await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();

    // The chip may be in the current month or the next one, depending on
    // where "two days from now" falls.
    const chip = page.getByRole('link', { name: new RegExp(`${team1} v ${team2}`) });
    if (!(await chip.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: 'Next month' }).click();
    }
    await expect(chip).toBeVisible();

    await chip.click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: `${team1} vs ${team2}` })).toBeVisible();
  });

  test('the list/calendar toggle moves between the two views', async ({ page }) => {
    const { groupId } = await createGroupAndGame(page, 'E2E Calendar Toggle');

    await page.goto(`/groups/${groupId}/games`);
    await page.getByRole('link', { name: 'Calendar' }).click();
    await page.waitForURL(`**/groups/${groupId}/calendar`);
    await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();

    await page.getByRole('link', { name: 'List' }).click();
    await page.waitForURL(`**/groups/${groupId}/games`);
  });
});
