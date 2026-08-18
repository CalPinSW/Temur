import { test, expect } from '@playwright/test';
import {
  E2E_USERS,
  primaryStorageState,
  secondaryStorageState,
  removeFriendshipBetween,
} from './helpers';

test.use({ storageState: primaryStorageState });

test.describe('Groups', () => {
  // Computed once via beforeAll, not as a plain describe-body const — the
  // latter isn't reliably re-used across tests (each test can re-evaluate
  // the describe body), so later tests ended up referencing a group name
  // that was never actually created.
  let groupName: string;
  test.beforeAll(() => {
    groupName = `E2E Group ${Date.now()}`;
  });

  test('creates a group', async ({ page }) => {
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill(groupName);
    await page.getByRole('button', { name: 'Create Group' }).click();

    await page.waitForURL(/\/groups\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: groupName })).toBeVisible();
    await expect(page.getByText('1 member')).toBeVisible();
  });

  test('edits the group description', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Description').fill('An E2E test group');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('An E2E test group')).toBeVisible();
  });

  test('creates a group-scoped game via the group detail page', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    await page.getByRole('link', { name: 'Create Game' }).click();

    // Scoped to main: Next's route-announcer live region can transiently
    // echo the same text right after a navigation, causing a strict-mode
    // "resolved to 2 elements" failure on an unscoped getByText.
    await expect(page.getByRole('main').getByText(groupName)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Friends' })).not.toBeVisible();
    // Visible From's default can land in the future depending on what day
    // the suite runs, which would redirect creation to the games list
    // instead of the detail page this test asserts against.
    const recentPast = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 16);
    await page.getByLabel('Visible From').fill(recentPast);
    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);

    // The group name is shown clearly on the game itself, not just implied
    // by how you navigated there.
    await expect(page.getByRole('main').getByText(groupName)).toBeVisible();

    await page.goto('/games');
    const card = page.locator('a', { hasText: groupName }).first();
    await expect(card).toBeVisible();
  });

  test('gates a not-yet-visible group game — admin preview only, hidden from other members', async ({
    page,
    browser,
  }) => {
    const previewGroupName = `E2E Preview Group ${Date.now()}`;
    const previewTeam1 = `E2E-GroupPreview-T1-${Date.now()}`;
    const previewTeam2 = `E2E-GroupPreview-T2-${Date.now()}`;

    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill(previewGroupName);
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[0-9a-f-]+$/);
    const groupId = new URL(page.url()).pathname.split('/').pop()!;

    await page.getByRole('link', { name: 'Invite Player' }).click();
    await page.getByPlaceholder('Search by username or name...').fill(E2E_USERS.secondary.username);
    await expect(page.getByText(E2E_USERS.secondary.displayName)).toBeVisible();
    await page.getByRole('button', { name: 'Invite' }).click();
    await expect(page.getByRole('button', { name: 'Sent' })).toBeVisible();

    const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
    const secondaryPage = await secondaryContext.newPage();
    try {
      await secondaryPage.goto('/groups/invites');
      await expect(secondaryPage.getByRole('main').getByText(previewGroupName)).toBeVisible();
      await secondaryPage.getByRole('button', { name: 'Accept' }).click();

      await page.goto(`/games/new?group=${groupId}`);
      // Kickoff must stay on/after Visible From (visibleAt <= kickoff_date
      // is enforced both client- and server-side).
      await page.getByLabel('Kickoff Date & Time').fill('2099-01-02T10:00');
      await page.getByLabel('Visible From').fill('2099-01-01T10:00');
      await page.getByLabel('Team 1 Name').fill(previewTeam1);
      await page.getByLabel('Team 2 Name').fill(previewTeam2);
      await page.getByRole('button', { name: 'Create Game' }).click();
      // Not yet visible — creation redirects to the games list, not into
      // the game itself (see games.spec.ts's dedicated test for that).
      await page.waitForURL('**/games');

      const heading = `${previewTeam1} vs ${previewTeam2}`;

      // Admin/creator: shown on the group's own games list as a reachable
      // preview, same treatment as the main games list.
      await page.goto(`/groups/${groupId}/games`);
      const card = page.getByRole('link', { name: new RegExp(heading) });
      await expect(card).toBeVisible();
      await expect(card.getByText('Not visible yet')).toBeVisible();
      await card.click();
      await page.waitForURL(/\/games\/[0-9a-f-]+$/);
      const gameUrl = page.url();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();

      // Regular member: the game doesn't appear on this list at all, even
      // though can_view_game's RLS would let them read the row directly...
      await secondaryPage.goto(`/groups/${groupId}/games`);
      await expect(secondaryPage.getByRole('link', { name: heading })).not.toBeVisible();
      await expect(secondaryPage.getByText(/scheduled yet/)).toBeVisible();

      // ...and can't reach it directly by URL either — the detail page
      // itself now enforces the same visible_at gate as the list.
      await secondaryPage.goto(gameUrl);
      await expect(secondaryPage.getByText(/could not be found/i)).toBeVisible();
    } finally {
      await secondaryContext.close();
    }
  });

  test('invites a second user who accepts, then gets promoted, demoted, and removed', async ({
    page,
    browser,
  }) => {
    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    await page.getByRole('link', { name: 'Invite Player' }).click();

    await page.getByPlaceholder('Search by username or name...').fill(E2E_USERS.secondary.username);
    await expect(page.getByText(E2E_USERS.secondary.displayName)).toBeVisible();
    await page.getByRole('button', { name: 'Invite' }).click();
    await expect(page.getByRole('button', { name: 'Sent' })).toBeVisible();

    const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
    const secondaryPage = await secondaryContext.newPage();
    try {
      await secondaryPage.goto('/groups/invites');
      await expect(secondaryPage.getByRole('main').getByText(groupName)).toBeVisible();
      await secondaryPage.getByRole('button', { name: 'Accept' }).click();
      await expect(secondaryPage.getByRole('main').getByText(groupName)).not.toBeVisible();
    } finally {
      await secondaryContext.close();
    }

    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    await expect(page.getByText('2 members')).toBeVisible();
    await page.getByRole('link', { name: 'View Members' }).click();
    await expect(page.getByText(E2E_USERS.secondary.displayName)).toBeVisible();

    const memberRow = page.locator('div.px-4.py-3', { hasText: E2E_USERS.secondary.displayName });
    await memberRow.getByRole('button', { name: 'Promote' }).click();
    await expect(memberRow.getByRole('button', { name: 'Demote' })).toBeVisible();
    await memberRow.getByRole('button', { name: 'Demote' }).click();
    await expect(memberRow.getByRole('button', { name: 'Promote' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await memberRow.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText(E2E_USERS.secondary.displayName)).not.toBeVisible();
  });

  test('leaves the group', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('link', { name: groupName }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Leave Group' }).click();
    await page.waitForURL('**/groups');
    await expect(page.getByRole('link', { name: groupName })).not.toBeVisible();
  });

  test('deletes a group, which also removes its games', async ({ page }) => {
    const deletableGroupName = `E2E Deletable Group ${Date.now()}`;

    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill(deletableGroupName);
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[0-9a-f-]+$/);

    await page.getByRole('link', { name: 'Create Game' }).click();
    // Visible From's default can land in the future depending on what day
    // the suite runs, which would redirect creation to the games list
    // instead of the detail page this test needs the URL of.
    const recentPast = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 16);
    await page.getByLabel('Visible From').fill(recentPast);
    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.waitForURL(/\/games\/[0-9a-f-]+$/);
    const gameUrl = page.url();

    await page.goto('/groups');
    await page.getByRole('link', { name: deletableGroupName }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete Group' }).click();
    await page.waitForURL('**/groups');
    await expect(page.getByRole('link', { name: deletableGroupName })).not.toBeVisible();

    await page.goto(gameUrl);
    await expect(page.getByText(/could not be found/i)).toBeVisible();
  });

  test('invites a friend who is not a group member to a single group game', async ({
    page,
    browser,
  }) => {
    const inviteGroupName = `E2E Invite Group ${Date.now()}`;
    const inviteTeam1 = `E2E-Invite-T1-${Date.now()}`;
    const inviteTeam2 = `E2E-Invite-T2-${Date.now()}`;

    // The invite UI only offers the admin's own friends, so establish a
    // friendship with secondary first. Cleanup is via direct DB delete
    // (not the UI) in `finally`, guaranteed to run regardless of where
    // this test fails — there's no "cancel my own sent request" button,
    // so a failure between here and the accept below would otherwise
    // leave a pending request neither side can clear through the app,
    // breaking every later spec that assumes these two start out as
    // strangers.
    try {
      await page.goto('/friends/search');
      await page
        .getByPlaceholder('Search by username or name...')
        .fill(E2E_USERS.secondary.username);
      const searchRow = page.locator('div.px-4.py-3', { hasText: E2E_USERS.secondary.displayName });
      await expect(searchRow).toBeVisible();
      await searchRow.getByRole('button', { name: 'Add' }).click();
      await expect(searchRow.getByRole('button', { name: 'Sent' })).toBeVisible();

      const secondaryContext = await browser.newContext({ storageState: secondaryStorageState });
      const secondaryPage = await secondaryContext.newPage();
      try {
        await secondaryPage.goto('/friends/requests');
        const requestRow = secondaryPage.locator('div.px-4.py-3', {
          hasText: E2E_USERS.primary.displayName,
        });
        // "Sent" above is optimistic UI, not proof the server write has
        // landed — give this more room than the default timeout, since
        // this runs late in a long, serially-run suite.
        await expect(requestRow).toBeVisible({ timeout: 15000 });
        await requestRow.getByRole('button', { name: 'Accept' }).click();

        // A group game secondary is not a member of.
        await page.goto('/groups/new');
        await page.getByLabel('Group Name').fill(inviteGroupName);
        await page.getByRole('button', { name: 'Create Group' }).click();
        await page.waitForURL(/\/groups\/[0-9a-f-]+$/);

        await page.getByRole('link', { name: 'Create Game' }).click();
        const recentPast = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 16);
        await page.getByLabel('Visible From').fill(recentPast);
        await page.getByLabel('Team 1 Name').fill(inviteTeam1);
        await page.getByLabel('Team 2 Name').fill(inviteTeam2);
        await page.getByRole('button', { name: 'Create Game' }).click();
        await page.waitForURL(/\/games\/[0-9a-f-]+$/);
        const gameUrl = page.url();

        // Not a member yet — RLS blocks the row entirely.
        await secondaryPage.goto(gameUrl);
        await expect(secondaryPage.getByText(/could not be found/i)).toBeVisible();

        // Invite secondary to just this game (not the group).
        await page.getByRole('button', { name: 'Invite More Friends' }).click();
        await page.getByLabel(E2E_USERS.secondary.displayName).check();
        await page.getByRole('button', { name: 'Send Invites' }).click();
        await expect(page.getByRole('button', { name: 'Hide' })).toBeVisible();

        // Now visible and signable, without being a group member.
        await secondaryPage.goto(gameUrl);
        await expect(
          secondaryPage.getByRole('heading', { name: `${inviteTeam1} vs ${inviteTeam2}` })
        ).toBeVisible();
        await secondaryPage.getByRole('button', { name: 'Sign up' }).click();
        await expect(secondaryPage.getByRole('button', { name: 'Withdraw' })).toBeVisible();

        await secondaryPage.goto('/groups');
        await expect(secondaryPage.getByRole('link', { name: inviteGroupName })).not.toBeVisible();
      } finally {
        await secondaryContext.close();
      }
    } finally {
      await removeFriendshipBetween(E2E_USERS.primary.username, E2E_USERS.secondary.username);
    }
  });
});
