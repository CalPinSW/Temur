import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { SupabaseMock } from './testUtils/supabaseMock';
import { useGroupStats } from '@/hooks/useGroupStats';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('useGroupStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the group's played appearances", async () => {
    const appearance = {
      game_id: 'game-1',
      kickoff_date: '2026-10-03T10:45:00.000Z',
      single_team: false,
      result_team1_score: 3,
      result_team2_score: 1,
      result_outcome: null,
      user_id: 'user-1',
      username: 'alice',
      display_name: 'Alice',
      avatar_url: null,
      team: 1,
      average_rating: 7.5,
      rating_count: 2,
    };
    mockSupabase.rpc.mockResolvedValueOnce({ data: [appearance], error: null });

    const { result } = renderHook(() => useGroupStats('group-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_group_stats_appearances', {
      p_group_id: 'group-1',
    });
    expect(result.current.appearances).toEqual([appearance]);
  });

  it('returns no appearances when the caller is not an admin', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('not authorized') });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useGroupStats('group-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.appearances).toEqual([]);
  });
});
