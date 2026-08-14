import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import {
  inviteFriendsToGame,
  acceptGameInvitation,
  declineGameInvitation,
} from '@/services/gameInvitationService';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('gameInvitationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('inviteFriendsToGame', () => {
    it('inserts an invitation per friend and notifies each of them', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { game_invitations: builder });

      await inviteFriendsToGame('game-1', ['user-2', 'user-3'], 'user-1', 'Alice');

      expect(builder.insert).toHaveBeenCalledWith([
        { game_id: 'game-1', invited_by: 'user-1', invited_user_id: 'user-2' },
        { game_id: 'game-1', invited_by: 'user-1', invited_user_id: 'user-3' },
      ]);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({ userId: 'user-2', type: 'game_invite' }),
        })
      );
    });

    it('does nothing when there are no friends to invite', async () => {
      await inviteFriendsToGame('game-1', [], 'user-1', 'Alice');

      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('throws when the insert fails and does not notify', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('boom') });
      mockFromTables(mockSupabase, { game_invitations: builder });

      await expect(inviteFriendsToGame('game-1', ['user-2'], 'user-1', 'Alice')).rejects.toThrow(
        'boom'
      );
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('acceptGameInvitation', () => {
    it('marks the invitation accepted and signs the player up', async () => {
      const invitationsBuilder = createQueryBuilder({ data: null, error: null });
      const playerGamesBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, {
        game_invitations: invitationsBuilder,
        player_games: playerGamesBuilder,
      });

      await acceptGameInvitation('invitation-1', 'game-1', 'user-2', 4);

      expect(invitationsBuilder.update).toHaveBeenCalledWith({ status: 'accepted' });
      expect(invitationsBuilder.eq).toHaveBeenCalledWith('id', 'invitation-1');
      expect(playerGamesBuilder.insert).toHaveBeenCalledWith({
        game_id: 'game-1',
        user_id: 'user-2',
        signup_order: 4,
      });
    });

    it('throws and does not sign up if marking accepted fails', async () => {
      const invitationsBuilder = createQueryBuilder({ data: null, error: new Error('gone') });
      const playerGamesBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, {
        game_invitations: invitationsBuilder,
        player_games: playerGamesBuilder,
      });

      await expect(acceptGameInvitation('invitation-1', 'game-1', 'user-2', 4)).rejects.toThrow(
        'gone'
      );
      expect(playerGamesBuilder.insert).not.toHaveBeenCalled();
    });
  });

  describe('declineGameInvitation', () => {
    it('deletes the invitation', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { game_invitations: builder });

      await declineGameInvitation('invitation-1');

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'invitation-1');
    });
  });
});
