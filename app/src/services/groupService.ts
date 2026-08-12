import { supabase } from './supabase';
import { NotificationTemplates } from './notificationService';
import { GroupRole } from '@/types/group';

export async function createGroup(name: string, description: string | null, createdBy: string) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, description, created_by: createdBy })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGroup(
  groupId: string,
  updates: { name?: string; description?: string | null }
): Promise<void> {
  const { error } = await supabase.from('groups').update(updates).eq('id', groupId);
  if (error) throw error;
}

export async function inviteToGroup(
  groupId: string,
  invitedUserId: string,
  invitedBy: string,
  groupName: string,
  inviterName: string
): Promise<void> {
  const { error } = await supabase.from('group_invitations').insert({
    group_id: groupId,
    invited_by: invitedBy,
    invited_user_id: invitedUserId,
  });

  if (error) throw error;

  const notification = NotificationTemplates.groupInvite(groupName, inviterName);
  await supabase.functions.invoke('send-notification', {
    body: {
      userId: invitedUserId,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    },
  });
}

export async function acceptGroupInvitation(
  invitationId: string,
  groupId: string,
  userId: string
): Promise<void> {
  const { error: joinError } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: userId,
    role: 'member',
  });

  if (joinError) throw joinError;

  const { error: deleteError } = await supabase
    .from('group_invitations')
    .delete()
    .eq('id', invitationId);

  if (deleteError) throw deleteError;
}

export async function declineGroupInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.from('group_invitations').delete().eq('id', invitationId);
  if (error) throw error;
}

export async function updateMemberRole(memberId: string, role: GroupRole): Promise<void> {
  const { error } = await supabase.from('group_members').update({ role }).eq('id', memberId);
  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('group_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
}
