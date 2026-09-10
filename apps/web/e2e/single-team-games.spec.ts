import { test, expect } from '@playwright/test';
import { createGroupAndGame, primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Single-team (league) games', () => {
  test('capacity is the squad size, no team assignment, tactics board still works', async ({
    page,
  }) => {
    const { groupId, team1, team2 } = await createGroupAndGame(page, 'E2E League', {
      singleTeam: true,
    });
    // createGroupAndGame leaves us on the new game's detail page.
    const gameUrl = page.url();

    await expect(page.getByRole('heading', { name: `${team1} vs ${team2}` })).toBeVisible();
    // Capacity is the squad size (default 6), not doubled.
    await expect(page.getByRole('heading', { name: 'Signed up (0/6)' })).toBeVisible();

    // The group setting is shown and read-only.
    await page.goto(`/groups/${groupId}`);
    await expect(page.getByText('One team — league fixtures against other teams')).toBeVisible();

    await page.goto(gameUrl);
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByRole('heading', { name: 'Signed up (1/6)' })).toBeVisible();

    // Admin action is a tactics board, not team assignment.
    await expect(page.getByRole('link', { name: 'Assign Teams' })).toBeHidden();
    await page.getByRole('link', { name: 'Tactics Board' }).click();
    await page.waitForURL(/\/games\/[0-9a-f-]+\/team-assignment$/);

    await expect(page.getByRole('heading', { name: 'Tactics Board' })).toBeVisible();
    await expect(page.getByText('In the squad: 0 / 6')).toBeVisible();

    await page.getByRole('button', { name: 'Fill Squad' }).click();
    await expect(page.getByText('In the squad: 1 / 6')).toBeVisible();

    await page.getByRole('button', { name: /Save Lineup/ }).click();
    // A save with no error keeps the count.
    await expect(page.getByText('In the squad: 1 / 6')).toBeVisible();
  });
});
