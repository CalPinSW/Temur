import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { getMyRatings, submitRatings } from '@/services/gameRatingService';
import * as Sentry from '@sentry/react-native';

export function usePlayerRatings(gameId: string, playerGameIds: string[], userId?: string) {
  const [ratings, setRatings] = useState<Record<string, number | undefined>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // playerGameIds is a fresh array every render (it's filtered/mapped by the
  // caller from game.player_games), so it can't be a dependency directly —
  // that would refetch every render. Join it into a primitive so the effect
  // only reruns when the actual set of ids changes, e.g. once the game
  // finishes loading and player_games goes from empty to populated.
  const playerGameIdsKey = playerGameIds.join(',');

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function loadRatings() {
      setIsLoading(true);
      try {
        const existing = await getMyRatings(playerGameIds, userId!);
        if (!cancelled) setRatings(existing);
      } catch (error) {
        console.error('Error loading ratings:', error);
        Sentry.captureException(error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadRatings();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, userId, playerGameIdsKey]);

  const setRating = (playerGameId: string, value: number | undefined) => {
    setRatings((prev) => ({ ...prev, [playerGameId]: value }));
  };

  const saveRatings = async (onSuccess: () => void) => {
    if (!userId) return;

    const toSave = Object.entries(ratings)
      .filter((entry): entry is [string, number] => entry[1] !== undefined)
      .map(([playerGameId, rating]) => ({ playerGameId, rating }));

    try {
      setIsSaving(true);
      await submitRatings(toSave, userId);
      Alert.alert('Success', 'Ratings saved!');
      onSuccess();
    } catch (error) {
      console.error('Error saving ratings:', error);
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to save ratings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return { ratings, setRating, saveRatings, isLoading, isSaving };
}
