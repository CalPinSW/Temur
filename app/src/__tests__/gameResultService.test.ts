import { SupabaseMock } from './testUtils/supabaseMock';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { setGameResult } from '@/services/gameResultService';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('gameResultService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setGameResult', () => {
    it('calls set_game_result with the scoreline and no outcome', async () => {
      await setGameResult('game-1', { type: 'score', team1Score: 3, team2Score: 1 });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_game_result', {
        p_game_id: 'game-1',
        p_team1_score: 3,
        p_team2_score: 1,
        p_outcome: null,
      });
    });

    it('calls set_game_result with an outcome and no scores', async () => {
      await setGameResult('game-1', { type: 'outcome', outcome: 'draw' });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_game_result', {
        p_game_id: 'game-1',
        p_team1_score: null,
        p_team2_score: null,
        p_outcome: 'draw',
      });
    });

    it('throws on error', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('nope') });

      await expect(
        setGameResult('game-1', { type: 'score', team1Score: 1, team2Score: 1 })
      ).rejects.toThrow('nope');
    });
  });
});
