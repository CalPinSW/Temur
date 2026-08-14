import { SupabaseMock } from './testUtils/supabaseMock';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables } from './testUtils/supabaseMock';
import { getMyRatings, submitRatings } from '@/services/gameRatingService';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('gameRatingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyRatings', () => {
    it('returns a map of player_game_id to rating', async () => {
      const rows = [
        { player_game_id: 'pg-1', rating: 8 },
        { player_game_id: 'pg-2', rating: 5 },
      ];
      const builder = createQueryBuilder({ data: rows, error: null });
      mockFromTables(mockSupabase, { player_ratings: builder });

      const result = await getMyRatings(['pg-1', 'pg-2'], 'user-1');

      expect(builder.eq).toHaveBeenCalledWith('rated_by', 'user-1');
      expect(builder.in).toHaveBeenCalledWith('player_game_id', ['pg-1', 'pg-2']);
      expect(result).toEqual({ 'pg-1': 8, 'pg-2': 5 });
    });

    it('returns an empty object without querying when there are no player game ids', async () => {
      const result = await getMyRatings([], 'user-1');

      expect(result).toEqual({});
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('throws on error', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('nope') });
      mockFromTables(mockSupabase, { player_ratings: builder });

      await expect(getMyRatings(['pg-1'], 'user-1')).rejects.toThrow('nope');
    });
  });

  describe('submitRatings', () => {
    it('upserts each rating keyed on player_game_id and rated_by', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { player_ratings: builder });

      await submitRatings(
        [
          { playerGameId: 'pg-1', rating: 7 },
          { playerGameId: 'pg-2', rating: 9 },
        ],
        'user-1'
      );

      expect(builder.upsert).toHaveBeenCalledWith(
        [
          { player_game_id: 'pg-1', rating: 7, rated_by: 'user-1' },
          { player_game_id: 'pg-2', rating: 9, rated_by: 'user-1' },
        ],
        { onConflict: 'player_game_id,rated_by' }
      );
    });

    it('does nothing when there are no ratings to save', async () => {
      await submitRatings([], 'user-1');

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('throws on error', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('nope') });
      mockFromTables(mockSupabase, { player_ratings: builder });

      await expect(submitRatings([{ playerGameId: 'pg-1', rating: 5 }], 'user-1')).rejects.toThrow(
        'nope'
      );
    });
  });
});
