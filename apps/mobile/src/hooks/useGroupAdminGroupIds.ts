import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';

export function useGroupAdminGroupIds(userId?: string) {
  const [adminGroupIds, setAdminGroupIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminGroupIds = useCallback(async () => {
    if (!userId) {
      setAdminGroupIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      setAdminGroupIds(new Set((data || []).map((row) => row.group_id)));
    } catch (error) {
      console.error('Error fetching admin group ids:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const load = () => fetchAdminGroupIds();
    load();

    if (!userId) return;

    const channel = supabase
      .channel(`group-admin-ids-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchAdminGroupIds();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAdminGroupIds, userId]);

  return { adminGroupIds, isLoading };
}
