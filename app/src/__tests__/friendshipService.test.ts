import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { removeFriend, getPendingRequestCount } from '@/services/friendshipService';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('friendshipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('removeFriend', () => {
    it('deletes both directions of the friendship', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { friendships: builder });

      await removeFriend('user-1', 'user-2');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(builder.delete).toHaveBeenCalledTimes(2);
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(builder.eq).toHaveBeenCalledWith('friend_id', 'user-2');
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-2');
      expect(builder.eq).toHaveBeenCalledWith('friend_id', 'user-1');
    });

    it('throws if deleting the first direction fails', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('boom') });
      mockFromTables(mockSupabase, { friendships: builder });

      await expect(removeFriend('user-1', 'user-2')).rejects.toThrow('boom');
    });
  });

  describe('getPendingRequestCount', () => {
    it('returns the pending request count for a user', async () => {
      const builder = createQueryBuilder({ data: null, error: null, count: 3 });
      mockFromTables(mockSupabase, { friendships: builder });

      const count = await getPendingRequestCount('user-1');

      expect(count).toBe(3);
      expect(builder.eq).toHaveBeenCalledWith('friend_id', 'user-1');
      expect(builder.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('returns 0 when count is null', async () => {
      const builder = createQueryBuilder({ data: null, error: null, count: null });
      mockFromTables(mockSupabase, { friendships: builder });

      const count = await getPendingRequestCount('user-1');

      expect(count).toBe(0);
    });

    it('throws when the query errors', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('network down') });
      mockFromTables(mockSupabase, { friendships: builder });

      await expect(getPendingRequestCount('user-1')).rejects.toThrow('network down');
    });
  });
});
