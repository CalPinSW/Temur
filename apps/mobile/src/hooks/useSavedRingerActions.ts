import { useState } from 'react';
import { Alert } from 'react-native';
import { saveRingerName, deleteSavedRinger } from '@/services/ringerService';

export function useSavedRingerActions(userId?: string) {
  const [isAddingRinger, setIsAddingRinger] = useState(false);
  const [isDeletingRinger, setIsDeletingRinger] = useState(false);

  const handleAddSavedRinger = async (name: string, onSuccess: () => void) => {
    const trimmedName = name.trim();
    if (!userId || !trimmedName) return;

    try {
      setIsAddingRinger(true);

      await saveRingerName(userId, trimmedName);

      onSuccess();
    } catch (error) {
      console.error('Error saving ringer:', error);
      Alert.alert('Error', 'Failed to save ringer. Please try again.');
    } finally {
      setIsAddingRinger(false);
    }
  };

  const handleDeleteSavedRinger = (ringerId: string, ringerName: string, onSuccess: () => void) => {
    Alert.alert(
      'Remove Ringer',
      `Are you sure you want to remove ${ringerName} from your saved ringers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingRinger(true);

              await deleteSavedRinger(ringerId);

              onSuccess();
            } catch (error) {
              console.error('Error deleting saved ringer:', error);
              Alert.alert('Error', 'Failed to remove ringer. Please try again.');
            } finally {
              setIsDeletingRinger(false);
            }
          },
        },
      ]
    );
  };

  return { isAddingRinger, isDeletingRinger, handleAddSavedRinger, handleDeleteSavedRinger };
}
