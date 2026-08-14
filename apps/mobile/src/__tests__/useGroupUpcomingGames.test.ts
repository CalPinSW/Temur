import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useGroupUpcomingGames } from '@/hooks/useGroupUpcomingGames';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('useGroupUpcomingGames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters out past games and marks whether the user has signed up', async () => {
    const gamesBuilder = createQueryBuilder({
      data: [
        {
          id: 'game-future',
          kickoff_date: '2099-01-01T18:00:00.000Z',
          group_id: 'group-1',
          player_games: [{ id: 'pg-1', user_id: 'user-1', signup_order: 1, team: null }],
        },
        {
          id: 'game-past',
          kickoff_date: '2020-01-01T18:00:00.000Z',
          group_id: 'group-1',
          player_games: [],
        },
      ],
      error: null,
    });
    mockFromTables(mockSupabase, { games: gamesBuilder });

    const { result } = renderHook(() => useGroupUpcomingGames('group-1', 'user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(gamesBuilder.eq).toHaveBeenCalledWith('group_id', 'group-1');
    expect(result.current.upcomingGames.map((g) => g.id)).toEqual(['game-future']);
    expect(result.current.upcomingGames[0].user_signed_up).toBe(true);
    expect(result.current.upcomingGames[0].player_count).toBe(1);
  });

  it('does not fetch without a logged-in user', () => {
    renderHook(() => useGroupUpcomingGames('group-1', undefined));

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('logs and stops loading when the fetch fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const gamesBuilder = createQueryBuilder({ data: null, error: new Error('boom') });
    mockFromTables(mockSupabase, { games: gamesBuilder });

    const { result } = renderHook(() => useGroupUpcomingGames('group-1', 'user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.upcomingGames).toEqual([]);
    consoleSpy.mockRestore();
  });
});
