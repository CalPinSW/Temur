import { test, expect } from '@playwright/test';
import { createGroupAndGame, primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Admin actions on a past game', () => {
  test('hides invite/ringer actions once kickoff has passed, keeps edit and delete', async ({
    page,
  }) => {
    const kickoffInThePast = new Date(Date.now() - 3 * 60 * 1000).toISOString().slice(0, 16);
    const { team1, team2 } = await createGroupAndGame(page, 'E2E PastGame', {
      kickoffDate: kickoffInThePast,
    });
    await expect(page.getByRole('heading', { name: `${team1} vs ${team2}` })).toBeVisible();

    // Still there — a game may need fixing up after it has been played.
    await expect(page.getByRole('link', { name: 'Edit Game' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Game' })).toBeVisible();

    // Gone — no point recruiting for a game that has already happened.
    await expect(page.getByRole('button', { name: 'Get Join Link' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Invite More Friends' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open to Ringers' })).toBeHidden();
  });
});
