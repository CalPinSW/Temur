import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import {
  createGroup,
  updateGroup,
  getGroupMessageTemplate,
  inviteToGroup,
  acceptGroupInvitation,
  declineGroupInvitation,
  updateMemberRole,
  removeMember,
  leaveGroup,
  deleteGroup,
} from '@/services/groupService';

const mockSupabase = supabase as unknown as SupabaseMock;

describe('groupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('inserts a group with the creator and returns it', async () => {
      const builder = createQueryBuilder({
        data: { id: 'group-1', name: 'Sunday League', description: null },
        error: null,
      });
      mockFromTables(mockSupabase, { groups: builder });

      const group = await createGroup('Sunday League', null, 'user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('groups');
      expect(builder.insert).toHaveBeenCalledWith({
        name: 'Sunday League',
        description: null,
        created_by: 'user-1',
      });
      expect(group).toEqual({ id: 'group-1', name: 'Sunday League', description: null });
    });

    it('throws when the insert fails', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('boom') });
      mockFromTables(mockSupabase, { groups: builder });

      await expect(createGroup('Sunday League', null, 'user-1')).rejects.toThrow('boom');
    });
  });

  describe('updateGroup', () => {
    it('updates the group row', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { groups: builder });

      await updateGroup('group-1', { name: 'New Name' });

      expect(builder.update).toHaveBeenCalledWith({ name: 'New Name' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'group-1');
    });

    it('passes through the team assignment message template', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { groups: builder });

      await updateGroup('group-1', { team_assignment_message_template: 'Good luck!' });

      expect(builder.update).toHaveBeenCalledWith({
        team_assignment_message_template: 'Good luck!',
      });
    });
  });

  describe('getGroupMessageTemplate', () => {
    it('returns the stored template', async () => {
      const builder = createQueryBuilder({
        data: { team_assignment_message_template: 'Good luck!' },
        error: null,
      });
      mockFromTables(mockSupabase, { groups: builder });

      const result = await getGroupMessageTemplate('group-1');

      expect(builder.select).toHaveBeenCalledWith('team_assignment_message_template');
      expect(builder.eq).toHaveBeenCalledWith('id', 'group-1');
      expect(result).toBe('Good luck!');
    });

    it('returns null when no template is set', async () => {
      const builder = createQueryBuilder({
        data: { team_assignment_message_template: null },
        error: null,
      });
      mockFromTables(mockSupabase, { groups: builder });

      const result = await getGroupMessageTemplate('group-1');

      expect(result).toBeNull();
    });

    it('throws when the fetch fails', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('boom') });
      mockFromTables(mockSupabase, { groups: builder });

      await expect(getGroupMessageTemplate('group-1')).rejects.toThrow('boom');
    });
  });

  describe('inviteToGroup', () => {
    it('inserts the invitation and sends a notification', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { group_invitations: builder });

      await inviteToGroup('group-1', 'user-2', 'user-1', 'Sunday League', 'Alice');

      expect(builder.insert).toHaveBeenCalledWith({
        group_id: 'group-1',
        invited_by: 'user-1',
        invited_user_id: 'user-2',
      });
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({ userId: 'user-2', type: 'group_invite' }),
        })
      );
    });

    it('throws when the invite insert fails and does not notify', async () => {
      const builder = createQueryBuilder({ data: null, error: new Error('duplicate') });
      mockFromTables(mockSupabase, { group_invitations: builder });

      await expect(
        inviteToGroup('group-1', 'user-2', 'user-1', 'Sunday League', 'Alice')
      ).rejects.toThrow('duplicate');
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('acceptGroupInvitation', () => {
    it('joins the group then deletes the invitation', async () => {
      const membersBuilder = createQueryBuilder({ data: null, error: null });
      const invitationsBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, {
        group_members: membersBuilder,
        group_invitations: invitationsBuilder,
      });

      await acceptGroupInvitation('invitation-1', 'group-1', 'user-2');

      expect(membersBuilder.insert).toHaveBeenCalledWith({
        group_id: 'group-1',
        user_id: 'user-2',
        role: 'member',
      });
      expect(invitationsBuilder.delete).toHaveBeenCalled();
      expect(invitationsBuilder.eq).toHaveBeenCalledWith('id', 'invitation-1');
    });

    it('throws and does not delete the invitation if joining fails', async () => {
      const membersBuilder = createQueryBuilder({ data: null, error: new Error('full') });
      const invitationsBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, {
        group_members: membersBuilder,
        group_invitations: invitationsBuilder,
      });

      await expect(acceptGroupInvitation('invitation-1', 'group-1', 'user-2')).rejects.toThrow(
        'full'
      );
      expect(invitationsBuilder.delete).not.toHaveBeenCalled();
    });
  });

  describe('declineGroupInvitation', () => {
    it('deletes the invitation', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { group_invitations: builder });

      await declineGroupInvitation('invitation-1');

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'invitation-1');
    });
  });

  describe('updateMemberRole', () => {
    it('updates the member role', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { group_members: builder });

      await updateMemberRole('member-1', 'admin');

      expect(builder.update).toHaveBeenCalledWith({ role: 'admin' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'member-1');
    });
  });

  describe('removeMember', () => {
    it('removes the member from any upcoming group games, then deletes the member row', async () => {
      const gamesBuilder = createQueryBuilder({
        data: [
          { id: 'game-future', kickoff_date: '2030-01-01T00:00:00.000Z' },
          { id: 'game-past', kickoff_date: '2020-01-01T00:00:00.000Z' },
        ],
        error: null,
      });
      const playerGamesBuilder = createQueryBuilder({ data: null, error: null });
      const membersBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, {
        games: gamesBuilder,
        player_games: playerGamesBuilder,
        group_members: membersBuilder,
      });

      await removeMember('member-1', 'group-1', 'user-2');

      expect(gamesBuilder.eq).toHaveBeenCalledWith('group_id', 'group-1');
      expect(playerGamesBuilder.delete).toHaveBeenCalled();
      expect(playerGamesBuilder.eq).toHaveBeenCalledWith('user_id', 'user-2');
      expect(playerGamesBuilder.in).toHaveBeenCalledWith('game_id', ['game-future']);
      expect(membersBuilder.delete).toHaveBeenCalled();
      expect(membersBuilder.eq).toHaveBeenCalledWith('id', 'member-1');
    });

    it('skips the player_games cleanup when the group has no upcoming games', async () => {
      const gamesBuilder = createQueryBuilder({
        data: [{ id: 'game-past', kickoff_date: '2020-01-01T00:00:00.000Z' }],
        error: null,
      });
      const membersBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { games: gamesBuilder, group_members: membersBuilder });

      await removeMember('member-1', 'group-1', 'user-2');

      expect(mockSupabase.from).not.toHaveBeenCalledWith('player_games');
      expect(membersBuilder.delete).toHaveBeenCalled();
    });

    it('throws and does not remove the member if the game signup cleanup fails', async () => {
      const gamesBuilder = createQueryBuilder({ data: null, error: new Error('boom') });
      const membersBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { games: gamesBuilder, group_members: membersBuilder });

      await expect(removeMember('member-1', 'group-1', 'user-2')).rejects.toThrow('boom');
      expect(membersBuilder.delete).not.toHaveBeenCalled();
    });
  });

  describe('leaveGroup', () => {
    it('removes the caller from any upcoming group games, then deletes the membership row', async () => {
      const gamesBuilder = createQueryBuilder({
        data: [{ id: 'game-future', kickoff_date: '2030-01-01T00:00:00.000Z' }],
        error: null,
      });
      const playerGamesBuilder = createQueryBuilder({ data: null, error: null });
      const membersBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, {
        games: gamesBuilder,
        player_games: playerGamesBuilder,
        group_members: membersBuilder,
      });

      await leaveGroup('group-1', 'user-1');

      expect(playerGamesBuilder.delete).toHaveBeenCalled();
      expect(playerGamesBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(playerGamesBuilder.in).toHaveBeenCalledWith('game_id', ['game-future']);
      expect(membersBuilder.delete).toHaveBeenCalled();
      expect(membersBuilder.eq).toHaveBeenCalledWith('group_id', 'group-1');
      expect(membersBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('skips the player_games cleanup when the group has no upcoming games', async () => {
      const gamesBuilder = createQueryBuilder({ data: [], error: null });
      const membersBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { games: gamesBuilder, group_members: membersBuilder });

      await leaveGroup('group-1', 'user-1');

      expect(mockSupabase.from).not.toHaveBeenCalledWith('player_games');
      expect(membersBuilder.delete).toHaveBeenCalled();
    });

    it('throws and does not leave the group if the game signup cleanup fails', async () => {
      const gamesBuilder = createQueryBuilder({ data: null, error: new Error('boom') });
      const membersBuilder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { games: gamesBuilder, group_members: membersBuilder });

      await expect(leaveGroup('group-1', 'user-1')).rejects.toThrow('boom');
      expect(membersBuilder.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteGroup', () => {
    it('calls delete_group with the group id', async () => {
      await deleteGroup('group-1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('delete_group', { p_group_id: 'group-1' });
    });

    it('throws on error', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('not authorized') });

      await expect(deleteGroup('group-1')).rejects.toThrow('not authorized');
    });
  });
});
