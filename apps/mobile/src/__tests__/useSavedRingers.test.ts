import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useSavedRingers } from '@/hooks/useSavedRingers';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('useSavedRingers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the current user’s saved ringers on mount', async () => {
    const rows = [
      { id: 'r-1', user_id: 'user-1', name: 'Alex', created_at: '', updated_at: '' },
      { id: 'r-2', user_id: 'user-1', name: 'Sam', created_at: '', updated_at: '' },
    ];
    const builder = createQueryBuilder({ data: rows, error: null });
    mockFromTables(mockSupabase, { saved_ringers: builder });

    const { result } = renderHook(() => useSavedRingers('user-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(result.current.ringers).toEqual(rows);
  });

  it('does nothing without a logged-in user', async () => {
    const { result } = renderHook(() => useSavedRingers(undefined));

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it('stops loading and logs on a fetch error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const builder = createQueryBuilder({ data: null, error: new Error('boom') });
    mockFromTables(mockSupabase, { saved_ringers: builder });

    const { result } = renderHook(() => useSavedRingers('user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.ringers).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
