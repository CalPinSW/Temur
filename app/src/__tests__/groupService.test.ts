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
  inviteToGroup,
  acceptGroupInvitation,
  declineGroupInvitation,
  updateMemberRole,
  removeMember,
  leaveGroup,
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
          body: expect.objectContaining({ userId: 'user-2' }),
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
    it('deletes the member row', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { group_members: builder });

      await removeMember('member-1');

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'member-1');
    });
  });

  describe('leaveGroup', () => {
    it('deletes the caller membership row', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { group_members: builder });

      await leaveGroup('group-1', 'user-1');

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('group_id', 'group-1');
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });
  });
});
