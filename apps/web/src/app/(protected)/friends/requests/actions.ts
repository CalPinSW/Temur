'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';

export interface RequestActionResult {
  error?: string;
}

export async function acceptRequest(requestId: string): Promise<RequestActionResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('friend_id', user.id);

  if (error) return { error: 'Failed to accept request. Please try again.' };

  revalidatePath('/friends/requests');
  revalidatePath('/friends');
  return {};
}

export async function declineRequest(requestId: string): Promise<RequestActionResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', requestId)
    .eq('friend_id', user.id);

  if (error) return { error: 'Failed to decline request. Please try again.' };

  revalidatePath('/friends/requests');
  revalidatePath('/friends');
  return {};
}
