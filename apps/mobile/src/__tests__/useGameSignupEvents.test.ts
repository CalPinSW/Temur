import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useGameSignupEvents } from '@/hooks/useGameSignupEvents';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('useGameSignupEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the game's signup events newest first", async () => {
    const event = {
      id: 'event-1',
      game_id: 'game-1',
      event_type: 'withdrew',
      user_id: 'user-1',
      guest_name: null,
      actor_id: 'user-1',
      waitlisted: false,
      created_at: '2026-10-03T17:04:00.000Z',
      user: { id: 'user-1', username: 'alice', display_name: 'Alice' },
      actor: { id: 'user-1', username: 'alice', display_name: 'Alice' },
    };
    const eventsBuilder = createQueryBuilder({ data: [event], error: null });
    mockFromTables(mockSupabase, { game_signup_events: eventsBuilder });

    const { result } = renderHook(() => useGameSignupEvents('game-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(eventsBuilder.eq).toHaveBeenCalledWith('game_id', 'game-1');
    expect(eventsBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.events).toEqual([event]);
  });

  it('returns no events when the query fails', async () => {
    const eventsBuilder = createQueryBuilder({ data: null, error: { message: 'denied' } });
    mockFromTables(mockSupabase, { game_signup_events: eventsBuilder });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useGameSignupEvents('game-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.events).toEqual([]);
  });
});
