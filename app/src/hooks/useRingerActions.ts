import { useState } from 'react';
import { Alert } from 'react-native';
import { addRinger, removeRinger, saveRingerName } from '@/services/ringerService';

export function useRingerActions(gameId: string, userId?: string) {
  const [isAddingRinger, setIsAddingRinger] = useState(false);
  const [isRemovingRinger, setIsRemovingRinger] = useState(false);

  const handleAddRinger = async (name: string, signupOrder: number, onSuccess: () => void) => {
    const trimmedName = name.trim();
    if (!userId || !trimmedName) return;

    try {
      setIsAddingRinger(true);

      await addRinger(gameId, trimmedName, userId, signupOrder);
      await saveRingerName(userId, trimmedName);

      Alert.alert('Success', `${trimmedName} has been added to the game!`);
      onSuccess();
    } catch (error) {
      console.error('Error adding ringer:', error);
      Alert.alert('Error', 'Failed to add ringer. Please try again.');
    } finally {
      setIsAddingRinger(false);
    }
  };

  const handleRemoveRinger = (playerGameId: string, ringerName: string, onSuccess: () => void) => {
    Alert.alert('Remove Ringer', `Are you sure you want to remove ${ringerName} from this game?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsRemovingRinger(true);

            await removeRinger(playerGameId);

            onSuccess();
          } catch (error) {
            console.error('Error removing ringer:', error);
            Alert.alert('Error', 'Failed to remove ringer. Please try again.');
          } finally {
            setIsRemovingRinger(false);
          }
        },
      },
    ]);
  };

  return { isAddingRinger, isRemovingRinger, handleAddRinger, handleRemoveRinger };
}
