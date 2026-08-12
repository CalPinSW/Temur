import { Alert } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useGameDetails } from '@/hooks/useGameDetails';

const mockSupabase = supabase as unknown as SupabaseMock;

const baseGameRow = {
  id: 'game-1',
  kickoff_date: '2026-01-01T18:00:00.000Z',
  players_per_team: 7,
  player_games: [
    {
      id: 'pg-2',
      user_id: 'user-2',
      signup_order: 2,
      team: null,
      created_at: '',
      profile: { id: 'user-2', username: 'bob', display_name: null, avatar_url: null },
    },
    {
      id: 'pg-1',
      user_id: 'user-1',
      signup_order: 1,
      team: null,
      created_at: '',
      profile: { id: 'user-1', username: 'alice', display_name: null, avatar_url: null },
    },
  ],
};

describe('useGameDetails', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('loads and sorts players by signup order for a future game', async () => {
    const gamesBuilder = createQueryBuilder({
      data: { ...baseGameRow, kickoff_date: '2099-01-01T18:00:00.000Z' },
      error: null,
    });
    const invitationsBuilder = createQueryBuilder({ data: null, error: null });
    mockFromTables(mockSupabase, { games: gamesBuilder, game_invitations: invitationsBuilder });

    const { result } = renderHook(() => useGameDetails('game-1', 'user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.game?.player_games.map((p) => p.signup_order)).toEqual([1, 2]);
    expect(result.current.game?.user_signed_up).toBe(true);
    expect(result.current.game?.player_count).toBe(2);
  });

  it('attaches average ratings for a past game', async () => {
    const gamesBuilder = createQueryBuilder({
      data: { ...baseGameRow, kickoff_date: '2020-01-01T18:00:00.000Z' },
      error: null,
    });
    const ratingsBuilder = createQueryBuilder({
      data: [
        { player_game_id: 'pg-1', rating: 4 },
        { player_game_id: 'pg-1', rating: 2 },
        { player_game_id: 'pg-2', rating: 5 },
      ],
      error: null,
    });
    const invitationsBuilder = createQueryBuilder({ data: null, error: null });
    mockFromTables(mockSupabase, {
      games: gamesBuilder,
      player_ratings: ratingsBuilder,
      game_invitations: invitationsBuilder,
    });

    const { result } = renderHook(() => useGameDetails('game-1', 'user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const pg1 = result.current.game?.player_games.find((p) => p.id === 'pg-1');
    const pg2 = result.current.game?.player_games.find((p) => p.id === 'pg-2');
    expect(pg1?.average_rating).toBe(3);
    expect(pg1?.rating_count).toBe(2);
    expect(pg2?.average_rating).toBe(5);
    expect(pg2?.rating_count).toBe(1);
  });

  it('shows an alert and stops loading when the fetch fails', async () => {
    const gamesBuilder = createQueryBuilder({ data: null, error: new Error('not found') });
    mockFromTables(mockSupabase, { games: gamesBuilder });

    const { result } = renderHook(() => useGameDetails('game-1', 'user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.game).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to load game details');
  });

  it('does not fetch without a logged-in user', () => {
    renderHook(() => useGameDetails('game-1', undefined));

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('unsubscribes from the realtime channel on unmount', async () => {
    const gamesBuilder = createQueryBuilder({ data: baseGameRow, error: null });
    const invitationsBuilder = createQueryBuilder({ data: null, error: null });
    mockFromTables(mockSupabase, { games: gamesBuilder, game_invitations: invitationsBuilder });

    const { result, unmount } = renderHook(() => useGameDetails('game-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });
});
