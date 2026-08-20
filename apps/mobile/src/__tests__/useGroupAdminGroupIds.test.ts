import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useGroupAdminGroupIds } from '@/hooks/useGroupAdminGroupIds';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('useGroupAdminGroupIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the admin group ids for a user', async () => {
    const builder = createQueryBuilder({ data: [{ group_id: 'group-1' }], error: null });
    mockFromTables(mockSupabase, { group_members: builder });

    const { result } = renderHook(() => useGroupAdminGroupIds('user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.adminGroupIds).toEqual(new Set(['group-1']));
  });

  // Regression test for a real bug: GamesListScreen, CreateGameScreen,
  // GameDetailScreen, and GroupDetailScreen (via useGroupUpcomingGames) all
  // call this hook for the same signed-in user, and tab navigators keep
  // inactive tabs mounted — so e.g. GamesListScreen and GroupDetailScreen
  // are genuinely mounted at once. When the realtime channel was named only
  // `group-admin-ids-${userId}`, the second instance's `.on()` call threw
  // "cannot add postgres_changes callbacks ... after subscribe()", which
  // the app's top-level ErrorBoundary caught by resetting the whole
  // navigator back to its first tab — surfacing as "tapping a group sends
  // you to the Games tab instead". Two concurrent mounts for the same
  // userId must not collide.
  it('lets two instances mount concurrently for the same user without colliding', async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    mockFromTables(mockSupabase, { group_members: builder });

    const first = renderHook(() => useGroupAdminGroupIds('user-1'));
    expect(() => renderHook(() => useGroupAdminGroupIds('user-1'))).not.toThrow();

    await waitFor(() => expect(first.result.current.isLoading).toBe(false));

    const channelNames = mockSupabase.channel.mock.calls.map(([name]) => name);
    expect(channelNames).toHaveLength(2);
    expect(new Set(channelNames).size).toBe(2);
  });
});
