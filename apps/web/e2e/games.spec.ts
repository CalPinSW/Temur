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
});
