import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { GroupInvitationWithDetails } from '@/types/group';

export function useGroupInvitations(userId?: string) {
  const [invitations, setInvitations] = useState<GroupInvitationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('group_invitations')
        .select(
          `
          id,
          group_id,
          invited_by,
          invited_user_id,
          created_at,
          group:groups (id, name),
          inviter:profiles!group_invitations_invited_by_fkey (id, username, display_name)
        `
        )
        .eq('invited_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitations((data as unknown as GroupInvitationWithDetails[]) || []);
    } catch (error) {
      console.error('Error fetching group invitations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchInvitations();

    if (!userId) return;

    const channel = supabase
      .channel(`group-invitations-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_invitations',
          filter: `invited_user_id=eq.${userId}`,
        },
        () => fetchInvitations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInvitations, userId]);

  return { invitations, isLoading, refetch: fetchInvitations };
}
