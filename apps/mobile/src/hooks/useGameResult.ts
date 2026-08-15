import { useState } from 'react';
import { Alert } from 'react-native';
import { setGameResult } from '@/services/gameResultService';
import { GameOutcome } from '@temur/shared';

export function useGameResult(gameId: string) {
  const [isSaving, setIsSaving] = useState(false);

  const saveScore = async (team1Score: number, team2Score: number, onSuccess: () => void) => {
    try {
      setIsSaving(true);
      await setGameResult(gameId, { type: 'score', team1Score, team2Score });
      onSuccess();
    } catch (error) {
      console.error('Error saving game result:', error);
      Alert.alert('Error', 'Failed to save result. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveOutcome = async (outcome: GameOutcome, onSuccess: () => void) => {
    try {
      setIsSaving(true);
      await setGameResult(gameId, { type: 'outcome', outcome });
      onSuccess();
    } catch (error) {
      console.error('Error saving game result:', error);
      Alert.alert('Error', 'Failed to save result. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, saveScore, saveOutcome };
}
