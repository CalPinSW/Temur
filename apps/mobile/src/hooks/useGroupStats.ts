import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { GroupStatsAppearance } from '@temur/shared';
import * as Sentry from '@sentry/react-native';

export function useGroupStats(groupId: string) {
  const [appearances, setAppearances] = useState<GroupStatsAppearance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppearances = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_group_stats_appearances', {
        p_group_id: groupId,
      });

      if (error) throw error;

      setAppearances((data ?? []) as GroupStatsAppearance[]);
    } catch (error) {
      console.error('Error fetching group stats:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    const load = () => fetchAppearances();
    load();
  }, [fetchAppearances]);

  return { appearances, isLoading, refetch: fetchAppearances };
}
