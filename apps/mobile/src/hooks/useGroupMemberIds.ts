import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import * as Sentry from '@sentry/react-native';

// Lighter than useGroupDetails: just the member id set, for callers (like
// filtering who's eligible to be invited to a group game) that don't need
// profiles or realtime updates.
export function useGroupMemberIds(groupId: string | null) {
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(!!groupId);

  const fetchMemberIds = useCallback(async () => {
    if (!groupId) {
      setMemberIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (error) throw error;

      setMemberIds(new Set((data || []).map((row) => row.user_id)));
    } catch (error) {
      console.error('Error fetching group member ids:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    const load = () => fetchMemberIds();
    load();
  }, [fetchMemberIds]);

  return { memberIds, isLoading };
}
