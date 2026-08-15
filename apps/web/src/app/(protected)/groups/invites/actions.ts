'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';

export interface InviteActionResult {
  error?: string;
}

export async function acceptGroupInvitation(
  invitationId: string,
  groupId: string
): Promise<InviteActionResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();

  const { error: joinError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: user.id, role: 'member' });

  if (joinError) return { error: 'Failed to accept invite. Please try again.' };

  const { error: deleteError } = await supabase
    .from('group_invitations')
    .delete()
    .eq('id', invitationId);

  if (deleteError) return { error: 'Failed to accept invite. Please try again.' };

  revalidatePath('/groups');
  revalidatePath('/groups/invites');
  return {};
}

export async function declineGroupInvitation(invitationId: string): Promise<InviteActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('group_invitations').delete().eq('id', invitationId);

  if (error) return { error: 'Failed to decline invite. Please try again.' };

  revalidatePath('/groups');
  revalidatePath('/groups/invites');
  return {};
}
