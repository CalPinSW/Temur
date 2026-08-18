import { test, expect } from '@playwright/test';
import { primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Games', () => {
  // See groups.spec.ts for why this is computed in beforeAll rather than
  // as a plain describe-body const.
  let team1: string;
  let team2: string;
  test.beforeAll(() => {
    const suffix = Date.now();
    team1 = `E2E-T1-${suffix}`;
    team2 = `E2E-T2-${suffix}`;
  });

  test('creates a friends-mode game', async ({ page }) => {
    await page.goto('/games/new');
    await expect(page.getByRole('heading', { name: 'Create Game' })).toBeVisible();

    // The suggested default Visible From can land in the future depending
    // on what day the suite runs — set it explicitly in the (recent) past
    // so this game is a normal, already-visible list item, not a preview
    // (that's its own dedicated test below). The games list only looks
    // back 90 days, so this has to be recent, not just "in the past".
    const recentPast = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 16);
    await page.getByLabel('Visible From').fill(recentPast);
    await page.getByLabel('Team 1 Name').fill(team1);
    await page.getByLabel('Team 2 Name').fill(team2);
    await page.getByRole('button', { name: 'Create Game' }).click();

    await page.waitForURL(/\/games\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: `${team1} vs ${team2}` })).toBeVisible();
  });

  test('shows the created game in the games list', async ({ page }) => {
    await page.goto('/games');
    await expect(page.getByRole('heading', { name: 'Games', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: `${team1} vs ${team2}` })).toBeVisible();
  });

  test('signs up and withdraws from a game', async ({ page }) => {
    await page.goto('/games');
    await page.getByRole('link', { name: `${team1} vs ${team2}` }).click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);

    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByRole('button', { name: 'Withdraw' })).toBeVisible();
    await expect(page.getByText(/^Signed up \(1\//)).toBeVisible();

    await page.getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
    await expect(page.getByText(/^Signed up \(0\//)).toBeVisible();
  });

  test('shows a not-yet-visible game to its creator greyed out and non-clickable', async ({
    page,
  }) => {
    const suffix = Date.now();
    const previewTeam1 = `E2E-Preview-T1-${suffix}`;
    const previewTeam2 = `E2E-Preview-T2-${suffix}`;

    await page.goto('/games/new');
    // Kickoff must stay on/after Visible From (visibleAt <= kickoff_date is
    // enforced both client- and server-side), so push both into the future
    // rather than only Visible From.
    await page.getByLabel('Kickoff Date & Time').fill('2099-01-02T10:00');
    await page.getByLabel('Visible From').fill('2099-01-01T10:00');
    await page.getByLabel('Team 1 Name').fill(previewTeam1);
    await page.getByLabel('Team 2 Name').fill(previewTeam2);
    await page.getByRole('button', { name: 'Create Game' }).click();

    // Not yet visible to anyone else (including the detail page, which has
    // no visibility gating of its own) — creation redirects to the games
    // list instead of walking the creator straight into it.
    await page.waitForURL('**/games');
    const heading = `${previewTeam1} vs ${previewTeam2}`;
    await expect(page.getByRole('link', { name: heading })).not.toBeVisible();
    const card = page.locator('div[aria-disabled="true"]', { hasText: previewTeam1 });
    await expect(card).toBeVisible();
    await expect(card.getByText('Not visible yet')).toBeVisible();
    // aria-disabled is decorative here — assert it's genuinely inert by
    // confirming the click doesn't navigate anywhere.
    await card.click();
    await expect(page).toHaveURL(/\/games$/);
  });

  test('creator deletes a game', async ({ page }) => {
    const suffix = Date.now();
    const deleteTeam1 = `E2E-Delete-T1-${suffix}`;
    const deleteTeam2 = `E2E-Delete-T2-${suffix}`;

    await page.goto('/games/new');
    const recentPast = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 16);
    await page.getByLabel('Visible From').fill(recentPast);
    await page.getByLabel('Team 1 Name').fill(deleteTeam1);
    await page.getByLabel('Team 2 Name').fill(deleteTeam2);
    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete Game' }).click();
    await page.waitForURL('**/games');

    await expect(
      page.getByRole('link', { name: `${deleteTeam1} vs ${deleteTeam2}` })
    ).not.toBeVisible();
  });
});
