import { test, expect } from '@playwright/test';
import { E2E_USERS, getLocalSupabaseStatus, primaryStorageState } from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Bug report', () => {
  test('submits a bug report from the profile page', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('link', { name: 'Report a Bug' }).click();
    await page.waitForURL('**/profile/report-bug');

    await page
      .getByLabel('What happened?')
      .fill(`E2E test bug report ${Date.now()} — the sign-up button did nothing.`);
    await page.getByRole('button', { name: 'Send Report' }).click();

    const success = page.getByText('Thanks — your report has been sent to support.');
    if (await success.isVisible({ timeout: 5000 }).catch(() => false)) {
      return;
    }

    // The Server Action's user-facing failure message doesn't distinguish
    // *why* it failed. Probe the Edge Function gateway directly (mirroring
    // the `response.status === 401` tolerance already used throughout
    // supabase/tests/*.test.ts) to check whether this environment's pinned
    // Supabase CLI is hitting the known "Invalid JWT" gateway bug (see the
    // README's "Invalid JWT" troubleshooting note) rather than a real
    // regression, before failing the test.
    if (await gatewayRejectsAuthenticatedFunctionCalls()) {
      test.skip(
        true,
        'Known Supabase gateway JWT-verification limitation on this environment — see README "Invalid JWT" troubleshooting note'
      );
    }

    await expect(success).toBeVisible();
  });
});

async function gatewayRejectsAuthenticatedFunctionCalls(): Promise<boolean> {
  const { API_URL, ANON_KEY } = getLocalSupabaseStatus();

  const tokenResponse = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: E2E_USERS.primary.email,
      password: E2E_USERS.primary.password,
    }),
  });
  const { access_token: accessToken } = await tokenResponse.json();
  if (!accessToken) return false;

  const functionResponse = await fetch(`${API_URL}/functions/v1/send-bug-report`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description: 'gateway probe from bug-report.spec.ts' }),
  });
  if (functionResponse.status !== 401) return false;

  const body = await functionResponse.json().catch(() => null);
  return body?.msg === 'Invalid JWT';
}
