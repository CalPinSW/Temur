'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';

export interface RemoveFriendState {
  error?: string;
}

export async function removeFriend(
  _prevState: RemoveFriendState,
  formData: FormData
): Promise<RemoveFriendState> {
  const friendId = String(formData.get('friendId') ?? '');
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();

  const [{ error: error1 }, { error: error2 }] = await Promise.all([
    supabase.from('friendships').delete().eq('user_id', user.id).eq('friend_id', friendId),
    supabase.from('friendships').delete().eq('user_id', friendId).eq('friend_id', user.id),
  ]);

  if (error1 || error2) {
    return { error: 'Failed to remove friend. Please try again.' };
  }

  revalidatePath('/friends');
  return {};
}
