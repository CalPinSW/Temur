import { supabase } from './supabase';

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  // Remove both directions of the friendship
  const { error: error1 } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId);

  if (error1) throw error1;

  const { error: error2 } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', friendId)
    .eq('friend_id', userId);

  if (error2) throw error2;
}

export async function getPendingRequestCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return count || 0;
}
