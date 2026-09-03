import { test, expect } from '@playwright/test';
import { E2E_USERS, primaryStorageState, secondaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Results & ratings', () => {
  test('enters a score result and rates the other player', async ({ page, browser }) => {
    const groupName = `E2E Results Group ${Date.now()}`;
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill(groupName);
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/([0-9a-f-]+)$/);
    const groupId = new URL(page.url()).pathname.split('/').pop()!;

    await page.getByRole('link', { name: 'Invite Player' }).click();
    await page.getByPlaceholder('Search by username or name...').fill(E2E_USERS.secondary.username);
    await page
      .locator('div.px-4.py-3', { hasText: E2E_USERS.secondary.displayName })
      .getByRole('button', { name: 'Invite' })
      .click();

    const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
    const secondaryPage = await secondaryContext.newPage();
    try {
      await secondaryPage.goto('/groups/invites');
      await secondaryPage.getByRole('button', { name: 'Accept' }).click();
      // Accepting is an async client-side transition, not a form submit/
      // navigation Playwright auto-waits for — wait for the invite to
      // actually disappear before treating secondary as a group member.
      await expect(secondaryPage.getByRole('main').getByText(groupName)).not.toBeVisible();

      // Create the game in the SAME group secondary just joined — not a
      // fresh one — otherwise secondary can't view it.
      const team1 = `E2E-Results-T1-${Date.now()}`;
      const team2 = `E2E-Results-T2-${Date.now()}`;
      await page.goto(`/games/new?group=${groupId}`);
      await page.getByLabel('Kickoff Date & Time').fill('2020-06-15T10:00');
      // Visible From's own default isn't tied to the Kickoff Date typed
      // above (it's computed once from the form's internal default
      // kickoff), so it can still land in the future unless set explicitly.
      await page.getByLabel('Visible From').fill('2020-06-08T10:00');
      await page.getByLabel('Team 1 Name').fill(team1);
      await page.getByLabel('Team 2 Name').fill(team2);
      await page.getByRole('button', { name: 'Create Game' }).click();
      await page.waitForURL(/\/games\/[0-9a-f-]+$/);
      const gameUrl = page.url();

      await secondaryPage.goto(gameUrl);
      await secondaryPage.getByRole('button', { name: 'Sign up' }).click();
      await expect(secondaryPage.getByRole('button', { name: 'Withdraw' })).toBeVisible();

      await page.reload();
      await expect(page.getByText('No result entered yet')).toBeVisible();
      await page.getByRole('link', { name: 'Enter Result' }).click();

      await page.getByLabel(team1).fill('3');
      await page.getByLabel(team2).fill('1');
      await page.getByRole('button', { name: 'Save Result' }).click();
      await expect(page.getByRole('main').getByText(`${team1} 3 - 1 ${team2}`)).toBeVisible();

      await page.getByRole('combobox').selectOption('9');
      await page.getByRole('button', { name: 'Save Ratings' }).click();
      await expect(page.getByText('Ratings saved!')).toBeVisible();

      await page.goto(gameUrl);
      await expect(page.getByRole('main').getByText(`${team1} 3 - 1 ${team2}`)).toBeVisible();
      await expect(page.getByText(/★ 9\.0 \(1\)/)).toBeVisible();

      // The aggregated average is admin-only. Secondary played and rated,
      // but isn't a group admin, so the score is visible to them while the
      // ★ average is not.
      await secondaryPage.goto(gameUrl);
      await expect(
        secondaryPage.getByRole('main').getByText(`${team1} 3 - 1 ${team2}`)
      ).toBeVisible();
      await expect(secondaryPage.getByText(/★/)).not.toBeVisible();
    } finally {
      await secondaryContext.close();
    }
  });
});
