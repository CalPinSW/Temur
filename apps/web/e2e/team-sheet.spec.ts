import { test, expect, type Page } from '@playwright/test';
import { E2E_USERS, createGroupAndGame, primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

async function signUpAndAssignToTeam1(page: Page) {
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByRole('link', { name: 'Assign Teams' }).click();
  await page.waitForURL(/\/team-assignment$/);
  await page.getByRole('button', { name: 'T1' }).click();
  await page.getByRole('button', { name: 'Save Team Assignments' }).click();
  await expect(page.getByRole('button', { name: /no changes/ })).toBeVisible();
}

test.describe('Team sheet message', () => {
  test('copies the default team sheet, then a group-customised one', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { groupId, team1, team2 } = await createGroupAndGame(page, 'E2E TeamSheet');
    const gameUrl = page.url();

    await signUpAndAssignToTeam1(page);
    await page.goto(gameUrl);

    await page.getByText('Preview', { exact: true }).click();
    const preview = page.getByTestId('team-sheet-preview');
    await expect(preview).toContainText('Teams are set:');
    await expect(preview).toContainText(`*${team1}*:\n${E2E_USERS.primary.displayName}`);
    await expect(preview).toContainText(`*${team2}*:`);
    await expect(preview).toContainText(/Be ready to play \d{1,2}:\d{2}(am|pm)/);

    await page.getByRole('button', { name: 'Copy Team Sheet' }).click();
    await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(`*${team1}*:\n${E2E_USERS.primary.displayName}`);

    await page.goto(`/groups/${groupId}`);
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Team Sheet Message')).toHaveValue(/^Teams are set:/);
    await page.getByLabel('Team Sheet Message').fill('Line-up for {team1}:\n{team1_players}');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();

    await page.goto(gameUrl);
    await page.getByText('Preview', { exact: true }).click();
    await expect(page.getByTestId('team-sheet-preview')).toHaveText(
      `Line-up for ${team1}:\n${E2E_USERS.primary.displayName}`
    );
  });
});
