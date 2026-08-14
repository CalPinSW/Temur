import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { SupabaseMock } from './testUtils/supabaseMock';
import { useGameResult } from '@/hooks/useGameResult';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('useGameResult', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('saveScore', () => {
    it('saves a scoreline and calls onSuccess', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useGameResult('game-1'));

      await act(async () => {
        await result.current.saveScore(3, 1, onSuccess);
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_game_result', {
        p_game_id: 'game-1',
        p_team1_score: 3,
        p_team2_score: 1,
        p_outcome: null,
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.isSaving).toBe(false);
    });

    it('shows an error alert and does not call onSuccess when saving fails', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('boom') });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useGameResult('game-1'));

      await act(async () => {
        await result.current.saveScore(3, 1, onSuccess);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Error', expect.any(String));
    });
  });

  describe('saveOutcome', () => {
    it('saves an outcome and calls onSuccess', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useGameResult('game-1'));

      await act(async () => {
        await result.current.saveOutcome('draw', onSuccess);
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_game_result', {
        p_game_id: 'game-1',
        p_team1_score: null,
        p_team2_score: null,
        p_outcome: 'draw',
      });
      expect(onSuccess).toHaveBeenCalled();
    });

    it('shows an error alert and does not call onSuccess when saving fails', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('boom') });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useGameResult('game-1'));

      await act(async () => {
        await result.current.saveOutcome('team1_win', onSuccess);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Error', expect.any(String));
    });
  });
});
