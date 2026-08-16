import { test, expect } from '@playwright/test';
import { E2E_USERS } from './helpers';

test.describe('Authentication', () => {
  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(E2E_USERS.primary.email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  });

  test('signs in and out', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(E2E_USERS.primary.email);
    await page.getByLabel('Password').fill(E2E_USERS.primary.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/games');
    await expect(page.getByRole('heading', { name: 'Games', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');
  });

  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.goto('/games');
    await page.waitForURL('**/login');
  });
});
