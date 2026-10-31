import { Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { usePlayerRatings } from '@/hooks/usePlayerRatings';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('usePlayerRatings', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('loads existing ratings for the current user and pre-fills them', async () => {
    const builder = createQueryBuilder({
      data: [{ player_game_id: 'pg-1', rating: 7 }],
      error: null,
    });
    mockFromTables(mockSupabase, { player_ratings: builder });

    const { result } = renderHook(() => usePlayerRatings('game-1', ['pg-1', 'pg-2'], 'user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.ratings).toEqual({ 'pg-1': 7 });
  });

  it('does not fetch when there are no ratable players', async () => {
    const { result } = renderHook(() => usePlayerRatings('game-1', [], 'user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('fetches once playerGameIds arrives after the initial empty render', async () => {
    const builder = createQueryBuilder({
      data: [{ player_game_id: 'pg-1', rating: 6 }],
      error: null,
    });
    mockFromTables(mockSupabase, { player_ratings: builder });

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => usePlayerRatings('game-1', ids, 'user-1'),
      { initialProps: { ids: [] } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockSupabase.from).not.toHaveBeenCalled();

    rerender({ ids: ['pg-1', 'pg-2'] });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(builder.eq).toHaveBeenCalledWith('rated_by', 'user-1');
    expect(result.current.ratings).toEqual({ 'pg-1': 6 });
  });

  it('saves only the valid, filled-in ratings and calls onSuccess', async () => {
    const readBuilder = createQueryBuilder({ data: [], error: null });
    const writeBuilder = createQueryBuilder({ data: null, error: null });
    mockFromTables(mockSupabase, { player_ratings: readBuilder });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => usePlayerRatings('game-1', ['pg-1', 'pg-2'], 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setRating('pg-1', 9);
      result.current.setRating('pg-2', undefined);
    });

    mockFromTables(mockSupabase, { player_ratings: writeBuilder });

    await act(async () => {
      await result.current.saveRatings(onSuccess);
    });

    expect(writeBuilder.upsert).toHaveBeenCalledWith(
      [{ player_game_id: 'pg-1', rating: 9, rated_by: 'user-1' }],
      { onConflict: 'player_game_id,rated_by' }
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows an error alert and does not call onSuccess when saving fails', async () => {
    const readBuilder = createQueryBuilder({ data: [], error: null });
    mockFromTables(mockSupabase, { player_ratings: readBuilder });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => usePlayerRatings('game-1', ['pg-1'], 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setRating('pg-1', 5);
    });

    const writeBuilder = createQueryBuilder({ data: null, error: new Error('boom') });
    mockFromTables(mockSupabase, { player_ratings: writeBuilder });

    await act(async () => {
      await result.current.saveRatings(onSuccess);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Error', expect.any(String));
  });

  it('reports a genuine save failure to Sentry', async () => {
    const readBuilder = createQueryBuilder({ data: [], error: null });
    mockFromTables(mockSupabase, { player_ratings: readBuilder });

    const { result } = renderHook(() => usePlayerRatings('game-1', ['pg-1'], 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setRating('pg-1', 5);
    });

    const rlsError = { code: '42501', details: null, hint: null, message: 'permission denied' };
    mockFromTables(mockSupabase, {
      player_ratings: createQueryBuilder({ data: null, error: rlsError }),
    });

    await act(async () => {
      await result.current.saveRatings(jest.fn());
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(rlsError);
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to save ratings. Please try again.');
  });

  it('tells the user to check their connection, without reporting to Sentry, when the save never reaches the server', async () => {
    const readBuilder = createQueryBuilder({ data: [], error: null });
    mockFromTables(mockSupabase, { player_ratings: readBuilder });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => usePlayerRatings('game-1', ['pg-1'], 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setRating('pg-1', 5);
    });

    mockFromTables(mockSupabase, {
      player_ratings: createQueryBuilder({
        data: null,
        error: {
          code: '',
          details: 'TypeError: Network request failed',
          hint: '',
          message: 'TypeError: Network request failed',
        },
      }),
    });

    await act(async () => {
      await result.current.saveRatings(onSuccess);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      "Couldn't connect. Check your connection and try again."
    );
    expect(result.current.isSaving).toBe(false);
  });
});
