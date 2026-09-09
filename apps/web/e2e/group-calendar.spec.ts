import { test, expect } from '@playwright/test';
import { createGroupAndGame, primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

const pad = (n: number) => String(n).padStart(2, '0');

test.describe('Group calendar', () => {
  test('shows a group game on its day and links through to the game', async ({ page }) => {
    const kickoff = new Date();
    kickoff.setDate(kickoff.getDate() + 2);
    kickoff.setHours(19, 0, 0, 0);
    const kickoffLocal = `${kickoff.getFullYear()}-${pad(kickoff.getMonth() + 1)}-${pad(
      kickoff.getDate()
    )}T19:00`;

    const { groupId, team1, team2 } = await createGroupAndGame(page, 'E2E Cal', {
      kickoffDate: kickoffLocal,
    });

    await page.goto(`/groups/${groupId}/calendar`);
    await expect(page.locator('.fc')).toBeVisible();

    const event = page.locator('.fc-event', { hasText: `${team1} v ${team2}` });
    if (!(await event.isVisible().catch(() => false))) {
      // "two days from now" may have rolled into next month.
      await page.locator('.fc-next-button').click();
    }
    await expect(event).toBeVisible();

    await event.click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: `${team1} vs ${team2}` })).toBeVisible();
  });

  test('switches views and moves via the list/calendar toggle', async ({ page }) => {
    const { groupId } = await createGroupAndGame(page, 'E2E Cal Nav');

    await page.goto(`/groups/${groupId}/games`);
    await page.getByRole('link', { name: 'Calendar', exact: true }).click();
    await page.waitForURL(`**/groups/${groupId}/calendar`);

    // FullCalendar view switcher.
    await expect(page.locator('.fc-daygrid')).toBeVisible();
    await page.getByRole('button', { name: 'Week' }).click();
    await expect(page.locator('.fc-timegrid')).toBeVisible();
    await page.getByRole('button', { name: 'List' }).click();
    await expect(page.locator('.fc-list')).toBeVisible();

    await page.getByRole('link', { name: 'List', exact: true }).click();
    await page.waitForURL(`**/groups/${groupId}/games`);
  });
});
