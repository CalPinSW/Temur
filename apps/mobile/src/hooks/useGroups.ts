import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { Group, GroupRole, GroupWithRole } from '@/types/group';

interface RawGroupMember {
  role: GroupRole;
  group: Group;
}

export function useGroups(userId?: string) {
  const [groups, setGroups] = useState<GroupWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('role, group:groups(*)')
        .eq('user_id', userId);

      if (error) throw error;

      const groupsWithRole: GroupWithRole[] = ((data as unknown as RawGroupMember[]) || []).map(
        (row) => ({ ...row.group, myRole: row.role })
      );

      groupsWithRole.sort((a, b) => a.name.localeCompare(b.name));
      setGroups(groupsWithRole);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const load = () => fetchGroups();
    load();

    if (!userId) return;

    const channel = supabase
      .channel(`groups-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${userId}` },
        () => fetchGroups()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () =>
        fetchGroups()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGroups, userId]);

  return { groups, isLoading, refetch: fetchGroups };
}
