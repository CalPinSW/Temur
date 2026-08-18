import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useGroupMemberIds } from '@/hooks/useGroupMemberIds';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('useGroupMemberIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the set of member ids for the given group', async () => {
    const membersBuilder = createQueryBuilder({
      data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
      error: null,
    });
    mockFromTables(mockSupabase, { group_members: membersBuilder });

    const { result } = renderHook(() => useGroupMemberIds('group-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(membersBuilder.eq).toHaveBeenCalledWith('group_id', 'group-1');
    expect(result.current.memberIds).toEqual(new Set(['user-1', 'user-2']));
  });

  it('returns an empty set without querying when groupId is null', async () => {
    const membersBuilder = createQueryBuilder({ data: [], error: null });
    mockFromTables(mockSupabase, { group_members: membersBuilder });

    const { result } = renderHook(() => useGroupMemberIds(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.memberIds).toEqual(new Set());
    expect(membersBuilder.eq).not.toHaveBeenCalled();
  });
});
