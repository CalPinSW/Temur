import { SupabaseMock } from './testUtils/supabaseMock';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables } from './testUtils/supabaseMock';
import {
  openGameToRingers,
  addRinger,
  removeRinger,
  getSavedRingers,
  saveRingerName,
  deleteSavedRinger,
} from '@/services/ringerService';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('ringerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openGameToRingers', () => {
    it('sets ringers_opened_at and ringers_opened_by on the game', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { games: builder });

      await openGameToRingers('game-1', 'user-1');

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ ringers_opened_by: 'user-1' })
      );
      expect(builder.eq).toHaveBeenCalledWith('id', 'game-1');
    });

    it('throws on error', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('nope') });
      mockFromTables(mockSupabase, { games: builder });

      await expect(openGameToRingers('game-1', 'user-1')).rejects.toThrow('nope');
    });
  });

  describe('addRinger', () => {
    it('inserts a ringer player_games row with a trimmed name', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { player_games: builder });

      await addRinger('game-1', '  Alex Smith  ', 'user-1', 5);

      expect(builder.insert).toHaveBeenCalledWith({
        game_id: 'game-1',
        is_ringer: true,
        guest_name: 'Alex Smith',
        added_by: 'user-1',
        signup_order: 5,
      });
    });

    it('throws on error', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('nope') });
      mockFromTables(mockSupabase, { player_games: builder });

      await expect(addRinger('game-1', 'Alex', 'user-1', 1)).rejects.toThrow('nope');
    });
  });

  describe('removeRinger', () => {
    it('deletes the player_games row by id', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { player_games: builder });

      await removeRinger('pg-1');

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'pg-1');
    });
  });

  describe('getSavedRingers', () => {
    it('returns saved ringers ordered by most recently used', async () => {
      const rows = [{ id: 'r-1', user_id: 'user-1', name: 'Alex', created_at: '', updated_at: '' }];
      const builder = createQueryBuilder({ data: rows, error: null });
      mockFromTables(mockSupabase, { saved_ringers: builder });

      const result = await getSavedRingers('user-1');

      expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(builder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(result).toEqual(rows);
    });

    it('returns an empty array when there is no data', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { saved_ringers: builder });

      expect(await getSavedRingers('user-1')).toEqual([]);
    });
  });

  describe('saveRingerName', () => {
    it('upserts on user_id and trimmed name', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { saved_ringers: builder });

      await saveRingerName('user-1', '  Alex Smith  ');

      expect(builder.upsert).toHaveBeenCalledWith(
        { user_id: 'user-1', name: 'Alex Smith' },
        { onConflict: 'user_id,name' }
      );
    });
  });

  describe('deleteSavedRinger', () => {
    it('deletes the saved_ringers row by id', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { saved_ringers: builder });

      await deleteSavedRinger('ringer-1');

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'ringer-1');
    });

    it('throws on error', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('nope') });
      mockFromTables(mockSupabase, { saved_ringers: builder });

      await expect(deleteSavedRinger('ringer-1')).rejects.toThrow('nope');
    });
  });
});
