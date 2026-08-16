import { useState, useEffect, useCallback } from 'react';
import { getSavedRingers } from '@/services/ringerService';
import { SavedRinger } from '@temur/shared';
import * as Sentry from '@sentry/react-native';

export function useSavedRingers(userId?: string) {
  const [ringers, setRingers] = useState<SavedRinger[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRingers = useCallback(async () => {
    if (!userId) return;

    try {
      setRingers(await getSavedRingers(userId));
    } catch (error) {
      console.error('Error fetching saved ringers:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const load = () => fetchRingers();
    load();
  }, [fetchRingers]);

  return { ringers, isLoading, refetch: fetchRingers };
}
