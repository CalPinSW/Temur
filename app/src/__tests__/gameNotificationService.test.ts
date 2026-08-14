import { SupabaseMock } from './testUtils/supabaseMock';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import {
  notifyTeamAssignments,
  notifyGroupMembersRingersOpen,
} from '@/services/gameNotificationService';
import { PlayerGameWithProfile } from '@/types/game';
import { createQueryBuilder, mockFromTables } from './testUtils/supabaseMock';

const mockSupabase = supabase as unknown as SupabaseMock;

function playerGame(overrides: Partial<PlayerGameWithProfile>): PlayerGameWithProfile {
  return {
    id: overrides.id ?? 'pg-1',
    game_id: 'game-1',
    user_id: overrides.user_id ?? 'user-1',
    signup_order: 1,
    team: overrides.team ?? null,
    board_x: null,
    board_y: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    is_ringer: false,
    guest_name: null,
    added_by: null,
    profile: {
      id: overrides.user_id ?? 'user-1',
      username: 'p',
      display_name: null,
      avatar_url: null,
    },
    ...overrides,
  };
}

describe('gameNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyTeamAssignments', () => {
    it('notifies each assigned player with their own team name', async () => {
      const players = [
        playerGame({ id: 'pg-1', user_id: 'user-1', team: 1 }),
        playerGame({ id: 'pg-2', user_id: 'user-2', team: 2 }),
      ];

      await notifyTeamAssignments('game-1', players, 'Team A', 'Team B', 'Good luck!');

      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            userId: 'user-1',
            type: 'team_assigned',
            body: "Good luck!\n\nYou're on Team A",
          }),
        })
      );
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            userId: 'user-2',
            type: 'team_assigned',
            body: "Good luck!\n\nYou're on Team B",
          }),
        })
      );
    });

    it('skips players with no team assigned', async () => {
      const players = [
        playerGame({ id: 'pg-1', user_id: 'user-1', team: 1 }),
        playerGame({ id: 'pg-2', user_id: 'user-2', team: null }),
      ];

      await notifyTeamAssignments('game-1', players, 'Team A', 'Team B', '');

      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(1);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({ body: expect.objectContaining({ userId: 'user-1' }) })
      );
    });

    it('does nothing when nobody has a team', async () => {
      const players = [playerGame({ id: 'pg-1', user_id: 'user-1', team: null })];

      await notifyTeamAssignments('game-1', players, 'Team A', 'Team B', '');

      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('notifyGroupMembersRingersOpen', () => {
    it('notifies every member of the group with the ringers-open template', async () => {
      const builder = createQueryBuilder({
        data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
        error: null,
      });
      mockFromTables(mockSupabase, { group_members: builder });

      await notifyGroupMembersRingersOpen('game-1', 'group-1', 'Need players!');

      expect(builder.eq).toHaveBeenCalledWith('group_id', 'group-1');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            userId: 'user-1',
            type: 'ringers_open',
            body: 'Need players!',
            data: { screen: 'GameDetail', gameId: 'game-1' },
          }),
        })
      );
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({ userId: 'user-2', type: 'ringers_open' }),
        })
      );
    });

    it('does nothing when the group has no members', async () => {
      const builder = createQueryBuilder({ data: [], error: null });
      mockFromTables(mockSupabase, { group_members: builder });

      await notifyGroupMembersRingersOpen('game-1', 'group-1', '');

      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('throws when the group_members query errors', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('boom') });
      mockFromTables(mockSupabase, { group_members: builder });

      await expect(notifyGroupMembersRingersOpen('game-1', 'group-1', '')).rejects.toThrow('boom');
    });
  });
});
