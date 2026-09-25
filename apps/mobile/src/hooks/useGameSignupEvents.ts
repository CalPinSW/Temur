import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { GameSignupEvent, GAME_SIGNUP_EVENT_SELECT } from '@temur/shared';
import * as Sentry from '@sentry/react-native';

export function useGameSignupEvents(gameId: string) {
  const [events, setEvents] = useState<GameSignupEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('game_signup_events')
        .select(GAME_SIGNUP_EVENT_SELECT)
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEvents((data ?? []) as unknown as GameSignupEvent[]);
    } catch (error) {
      console.error('Error fetching game signup events:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    const load = () => fetchEvents();
    load();
  }, [fetchEvents]);

  return { events, isLoading, refetch: fetchEvents };
}
