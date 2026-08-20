import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import * as Sentry from '@sentry/react-native';

export function useGroupAdminGroupIds(userId?: string) {
  const [adminGroupIds, setAdminGroupIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  // This hook is called concurrently for the same userId from multiple
  // mounted screens (GamesListScreen, CreateGameScreen, GameDetailScreen,
  // and GroupDetailScreen via useGroupUpcomingGames — tab navigators keep
  // inactive tabs mounted, so e.g. GamesListScreen and GroupDetailScreen
  // are both alive at once). A channel name keyed only by userId collided
  // across those instances: the second .on()/.subscribe() call throws
  // "cannot add postgres_changes callbacks ... after subscribe()", which
  // was surfacing as the whole app bouncing back to the Games tab (the
  // top-level ErrorBoundary catches it and auto-resets the navigator).
  // A per-instance suffix keeps every mount's channel independent.
  const [instanceId] = useState(() => Math.random().toString(36).slice(2));

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
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const load = () => fetchAdminGroupIds();
    load();

    if (!userId) return;

    const channel = supabase
      .channel(`group-admin-ids-${userId}-${instanceId}`)
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
  }, [fetchAdminGroupIds, userId, instanceId]);

  return { adminGroupIds, isLoading };
}
