import {
  formatDate,
  formatTime,
  formatDateTimeLocalInputValue,
  parseDateTimeLocalInputValue,
  getGameCapacity,
  getActivePlayers,
  getWaitlistPlayers,
  getTeamCounts,
  isGameAdmin,
  getGameVisibilityStatus,
  getPlayerDisplayName,
  getNextSignupOrder,
  getNextSaturday,
  getDefaultKickoffDate,
  getDefaultVisibleAt,
  isVisibleAtBeforeKickoff,
} from '../utils/gameUtils';
import { PlayerGameWithProfile } from '../types/game';

function makePlayer(overrides: Partial<PlayerGameWithProfile>): PlayerGameWithProfile {
  return {
    id: `pg-${overrides.signup_order ?? 0}`,
    game_id: 'game-1',
    user_id: `user-${overrides.signup_order ?? 0}`,
    signup_order: 0,
    team: null,
    board_x: null,
    board_y: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    is_ringer: false,
    guest_name: null,
    added_by: null,
    profile: {
      id: `user-${overrides.signup_order ?? 0}`,
      username: `player${overrides.signup_order ?? 0}`,
      display_name: null,
      avatar_url: null,
    },
    ...overrides,
  };
}

describe('gameUtils', () => {
  describe('formatDate', () => {
    it('formats an ISO date as a long UK-style date', () => {
      expect(formatDate('2026-03-05T18:30:00.000Z')).toBe('Thursday, 5 March 2026');
    });
  });

  describe('formatTime', () => {
    it('formats an ISO date as a 24-hour UK-style time', () => {
      expect(formatTime('2026-03-05T18:30:00.000Z')).toBe('18:30');
    });

    it('renders BST-affected instants in UK local time regardless of the runtime timezone', () => {
      // 18:30 UTC in July is 19:30 in the UK, since BST (UTC+1) is in effect.
      // This must hold no matter what timezone the process running the test
      // (or the server rendering the page) happens to be in.
      expect(formatTime('2026-07-05T18:30:00.000Z')).toBe('19:30');
    });
  });

  describe('formatDateTimeLocalInputValue / parseDateTimeLocalInputValue', () => {
    it('round-trips a GMT instant through a datetime-local string unchanged', () => {
      const iso = '2026-01-10T18:30:00.000Z';
      const value = formatDateTimeLocalInputValue(iso);
      expect(value).toBe('2026-01-10T18:30');
      expect(parseDateTimeLocalInputValue(value).toISOString()).toBe(iso);
    });

    it('round-trips a BST instant through UK wall-clock time, not the runtime timezone', () => {
      const iso = '2026-07-05T18:30:00.000Z';
      const value = formatDateTimeLocalInputValue(iso);
      expect(value).toBe('2026-07-05T19:30');
      expect(parseDateTimeLocalInputValue(value).toISOString()).toBe(iso);
    });
  });

  describe('getGameCapacity', () => {
    it('doubles players per team to get total capacity', () => {
      expect(getGameCapacity(7)).toBe(14);
      expect(getGameCapacity(0)).toBe(0);
    });
  });

  describe('getActivePlayers / getWaitlistPlayers', () => {
    const players = [1, 2, 3, 4, 5].map((signup_order) => makePlayer({ signup_order }));

    it('splits players into active and waitlist by signup order against capacity', () => {
      const active = getActivePlayers(players, 3);
      const waitlist = getWaitlistPlayers(players, 3);

      expect(active.map((p) => p.signup_order)).toEqual([1, 2, 3]);
      expect(waitlist.map((p) => p.signup_order)).toEqual([4, 5]);
    });

    it('treats all players as active when capacity exceeds signups', () => {
      expect(getActivePlayers(players, 10)).toHaveLength(5);
      expect(getWaitlistPlayers(players, 10)).toHaveLength(0);
    });

    it('returns no active players when capacity is zero', () => {
      expect(getActivePlayers(players, 0)).toHaveLength(0);
      expect(getWaitlistPlayers(players, 0)).toHaveLength(5);
    });
  });

  describe('getNextSignupOrder', () => {
    it('returns 1 for an empty player list', () => {
      expect(getNextSignupOrder([])).toBe(1);
    });

    it('returns one past the highest existing signup_order', () => {
      const players = [1, 2, 3].map((signup_order) => makePlayer({ signup_order }));
      expect(getNextSignupOrder(players)).toBe(4);
    });

    it('is not fooled by a gap left by a withdrawal (uses max, not count)', () => {
      const players = [1, 2, 5].map((signup_order) => makePlayer({ signup_order }));
      expect(getNextSignupOrder(players)).toBe(6);
    });
  });

  describe('isGameAdmin', () => {
    it('returns false when there is no logged-in user', () => {
      const game = { group_id: null, created_by: 'user-1' };
      expect(isGameAdmin(game, undefined, new Set())).toBe(false);
    });

    it('treats the creator as admin of a groupless game', () => {
      const game = { group_id: null, created_by: 'user-1' };
      expect(isGameAdmin(game, 'user-1', new Set())).toBe(true);
      expect(isGameAdmin(game, 'user-2', new Set())).toBe(false);
    });

    it('treats a groupless legacy game (no creator) as adminless', () => {
      const game = { group_id: null, created_by: null };
      expect(isGameAdmin(game, 'user-1', new Set())).toBe(false);
    });

    it('treats any admin of the game group as admin, regardless of creator', () => {
      const game = { group_id: 'group-1', created_by: 'user-1' };
      expect(isGameAdmin(game, 'user-2', new Set(['group-1']))).toBe(true);
      expect(isGameAdmin(game, 'user-1', new Set())).toBe(false);
    });
  });

  describe('getGameVisibilityStatus', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    it('is visible and not a preview once visible_at has passed, for anyone', () => {
      const game = { visible_at: past, group_id: null, created_by: 'user-1' };
      expect(getGameVisibilityStatus(game, 'user-2', new Set())).toEqual({
        visible: true,
        isPreview: false,
      });
    });

    it('hides a not-yet-visible game from a non-admin', () => {
      const game = { visible_at: future, group_id: null, created_by: 'user-1' };
      expect(getGameVisibilityStatus(game, 'user-2', new Set())).toEqual({
        visible: false,
        isPreview: false,
      });
    });

    it('shows a not-yet-visible game to its admin as a preview', () => {
      const game = { visible_at: future, group_id: null, created_by: 'user-1' };
      expect(getGameVisibilityStatus(game, 'user-1', new Set())).toEqual({
        visible: true,
        isPreview: true,
      });
    });

    it('shows a not-yet-visible group game to a group admin as a preview', () => {
      const game = { visible_at: future, group_id: 'group-1', created_by: 'user-1' };
      expect(getGameVisibilityStatus(game, 'user-2', new Set(['group-1']))).toEqual({
        visible: true,
        isPreview: true,
      });
    });
  });

  describe('getPlayerDisplayName', () => {
    it('prefers display_name over username for a regular player', () => {
      const player = makePlayer({
        profile: { id: 'user-1', username: 'p1', display_name: 'Player One', avatar_url: null },
      });
      expect(getPlayerDisplayName(player)).toBe('Player One');
    });

    it('falls back to username when display_name is null', () => {
      const player = makePlayer({
        profile: { id: 'user-1', username: 'p1', display_name: null, avatar_url: null },
      });
      expect(getPlayerDisplayName(player)).toBe('p1');
    });

    it('returns the guest name for a ringer, ignoring any profile', () => {
      const player = makePlayer({ is_ringer: true, guest_name: 'Some Ringer', profile: null });
      expect(getPlayerDisplayName(player)).toBe('Some Ringer');
    });

    it('falls back to "Guest" for a ringer with no guest name', () => {
      const player = makePlayer({ is_ringer: true, guest_name: null, profile: null });
      expect(getPlayerDisplayName(player)).toBe('Guest');
    });

    it('does not blow up for a regular player with a null profile', () => {
      const player = makePlayer({ profile: null });
      expect(getPlayerDisplayName(player)).toBe('');
    });
  });

  describe('getTeamCounts', () => {
    it('tallies players by team assignment', () => {
      const counts = getTeamCounts({
        a: 1,
        b: 1,
        c: 2,
        d: null,
      });

      expect(counts).toEqual({ team1: 2, team2: 1, unassigned: 1 });
    });

    it('returns all zeros for an empty assignment map', () => {
      expect(getTeamCounts({})).toEqual({ team1: 0, team2: 0, unassigned: 0 });
    });
  });

  describe('getNextSaturday', () => {
    it('advances a full week when starting exactly on a Saturday', () => {
      // 2026-03-07 is a Saturday; using local (not UTC) constructors avoids
      // timezone off-by-one-day surprises when comparing calendar dates.
      // "Next" is strictly after the input, so an already-Saturday input
      // rolls forward a full week rather than returning the same day.
      const saturday = new Date(2026, 2, 7);
      const result = getNextSaturday(saturday);
      expect(result.getDay()).toBe(6);
      expect(result.getTime()).toBeGreaterThan(saturday.getTime());
      expect(isSameCalendarDay(result, new Date(2026, 2, 14))).toBe(true);
    });

    it('rolls forward to the next Saturday from a weekday', () => {
      const wednesday = new Date(2026, 2, 4);
      const result = getNextSaturday(wednesday);
      expect(result.getDay()).toBe(6);
      expect(result.getTime()).toBeGreaterThan(wednesday.getTime());
    });
  });

  describe('getDefaultKickoffDate', () => {
    it('skips Saturdays that already have a game', () => {
      const nextSaturday = getNextSaturday(new Date());
      const result = getDefaultKickoffDate([nextSaturday]);
      expect(isSameCalendarDay(result, nextSaturday)).toBe(false);
      expect(result.getTime()).toBeGreaterThan(nextSaturday.getTime());
    });
  });

  describe('getDefaultVisibleAt', () => {
    it('is exactly 6 days before kickoff, same time of day', () => {
      const kickoff = new Date('2026-03-14T10:45:00.000Z');
      const result = getDefaultVisibleAt(kickoff);
      expect(result.toISOString()).toBe('2026-03-08T10:45:00.000Z');
    });
  });

  describe('isVisibleAtBeforeKickoff', () => {
    it('accepts a visibleAt earlier than kickoff', () => {
      expect(
        isVisibleAtBeforeKickoff(new Date('2026-03-14T10:45:00.000Z'), new Date('2026-03-07T10:45:00.000Z'))
      ).toBe(true);
    });

    it('accepts a visibleAt equal to kickoff', () => {
      const same = new Date('2026-03-14T10:45:00.000Z');
      expect(isVisibleAtBeforeKickoff(same, same)).toBe(true);
    });

    it('rejects a visibleAt later than kickoff', () => {
      expect(
        isVisibleAtBeforeKickoff(new Date('2026-03-07T10:45:00.000Z'), new Date('2026-03-14T10:45:00.000Z'))
      ).toBe(false);
    });
  });
});

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
