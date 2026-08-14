import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { Group, GroupMemberWithProfile } from '@/types/group';

export function useGroupDetails(groupId: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroupDetails = useCallback(async () => {
    try {
      const [{ data: groupData, error: groupError }, { data: membersData, error: membersError }] =
        await Promise.all([
          supabase.from('groups').select('*').eq('id', groupId).single(),
          supabase
            .from('group_members')
            .select(
              `
            id,
            group_id,
            user_id,
            role,
            created_at,
            updated_at,
            profile:profiles (
              id,
              username,
              display_name,
              avatar_url
            )
          `
            )
            .eq('group_id', groupId),
        ]);

      if (groupError) throw groupError;
      if (membersError) throw membersError;

      setGroup(groupData as Group);

      const sortedMembers = ((membersData as unknown as GroupMemberWithProfile[]) || []).sort(
        (a, b) => {
          if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
          return (a.profile.display_name || a.profile.username).localeCompare(
            b.profile.display_name || b.profile.username
          );
        }
      );
      setMembers(sortedMembers);
    } catch (error) {
      console.error('Error fetching group details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroupDetails();

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => fetchGroupDetails()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
        () => fetchGroupDetails()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGroupDetails, groupId]);

  return { group, members, isLoading, refetch: fetchGroupDetails };
}
