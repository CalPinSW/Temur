import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useRingerActions } from '@/hooks/useRingerActions';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('useRingerActions', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('handleAddRinger', () => {
    it('inserts the ringer, saves the name, and calls onSuccess', async () => {
      const playerGamesBuilder = createQueryBuilder({ data: null, error: null });
      const savedRingersBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, {
        player_games: playerGamesBuilder,
        saved_ringers: savedRingersBuilder,
      });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useRingerActions('game-1', 'user-1'));

      await act(async () => {
        await result.current.handleAddRinger('  Alex Smith  ', 5, onSuccess);
      });

      expect(playerGamesBuilder.insert).toHaveBeenCalledWith({
        game_id: 'game-1',
        is_ringer: true,
        guest_name: 'Alex Smith',
        added_by: 'user-1',
        signup_order: 5,
      });
      expect(savedRingersBuilder.upsert).toHaveBeenCalledWith(
        { user_id: 'user-1', name: 'Alex Smith' },
        { onConflict: 'user_id,name' }
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Success', expect.stringContaining('Alex Smith'));
      expect(result.current.isAddingRinger).toBe(false);
    });

    it('does nothing without a logged-in user', async () => {
      const { result } = renderHook(() => useRingerActions('game-1', undefined));

      await act(async () => {
        await result.current.handleAddRinger('Alex', 1, jest.fn());
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('does nothing for a blank name', async () => {
      const { result } = renderHook(() => useRingerActions('game-1', 'user-1'));

      await act(async () => {
        await result.current.handleAddRinger('   ', 1, jest.fn());
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('shows an error alert and does not call onSuccess when the insert fails', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('boom') });
      mockFromTables(mockSupabase, { player_games: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useRingerActions('game-1', 'user-1'));

      await act(async () => {
        await result.current.handleAddRinger('Alex', 1, onSuccess);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Error', expect.any(String));
    });
  });

  describe('handleRemoveRinger', () => {
    it('deletes the player_games row and calls onSuccess', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { player_games: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useRingerActions('game-1', 'user-1'));

      await act(async () => {
        await result.current.handleRemoveRinger('pg-1', onSuccess);
      });

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'pg-1');
      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.isRemovingRinger).toBe(false);
    });

    it('shows an error alert and does not call onSuccess when the delete fails', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('boom') });
      mockFromTables(mockSupabase, { player_games: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useRingerActions('game-1', 'user-1'));

      await act(async () => {
        await result.current.handleRemoveRinger('pg-1', onSuccess);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Error', expect.any(String));
    });
  });
});
