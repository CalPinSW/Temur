import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { Profile } from '@/types/auth';

interface RawFriendship {
  friend: Profile | Profile[];
}

export function useAcceptedFriends(userId?: string) {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!userId) return;

    try {
      const [{ data: sentData, error: sentError }, { data: receivedData, error: receivedError }] =
        await Promise.all([
          supabase
            .from('friendships')
            .select('friend:profiles!friendships_friend_id_fkey(*)')
            .eq('user_id', userId)
            .eq('status', 'accepted'),
          supabase
            .from('friendships')
            .select('friend:profiles!friendships_user_id_fkey(*)')
            .eq('friend_id', userId)
            .eq('status', 'accepted'),
        ]);

      if (sentError) throw sentError;
      if (receivedError) throw receivedError;

      const toProfile = (item: RawFriendship) =>
        Array.isArray(item.friend) ? item.friend[0] : item.friend;

      const allFriends = [
        ...((sentData as unknown as RawFriendship[]) || []),
        ...((receivedData as unknown as RawFriendship[]) || []),
      ].map(toProfile);

      const uniqueFriends = allFriends.filter(
        (friend, index, self) => index === self.findIndex((f) => f.id === friend.id)
      );

      setFriends(uniqueFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return { friends, isLoading, refetch: fetchFriends };
}
