'use server';

import { type Profile } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

export async function searchUsersToInvite(
  groupId: string,
  query: string,
  existingMemberIds: string[]
): Promise<Profile[]> {
  const user = await getUser();
  if (!user || query.trim().length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq('id', user.id)
    .limit(20);

  if (error) return [];
  return (data as Profile[]).filter((profile) => !existingMemberIds.includes(profile.id));
}

export interface SendInviteResult {
  error?: string;
}

export async function sendGroupInvite(
  groupId: string,
  invitedUserId: string
): Promise<SendInviteResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();

  const { error } = await supabase.from('group_invitations').insert({
    group_id: groupId,
    invited_by: user.id,
    invited_user_id: invitedUserId,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'You already invited this player to the group.' };
    }
    return { error: 'Failed to send invite. Please try again.' };
  }

  const [{ data: senderProfile }, { data: group }] = await Promise.all([
    supabase.from('profiles').select('username, display_name').eq('id', user.id).single(),
    supabase.from('groups').select('name').eq('id', groupId).single(),
  ]);

  const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';

  await supabase.functions.invoke('send-notification', {
    body: {
      userId: invitedUserId,
      type: 'group_invite',
      title: 'New Group Invite',
      body: `${senderName} invited you to join ${group?.name ?? 'a group'}`,
      data: { screen: 'GroupInvites' },
    },
  });

  return {};
}
