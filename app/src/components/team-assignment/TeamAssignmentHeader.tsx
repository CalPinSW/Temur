import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedTextBox } from '@/components/themed';
import { formatDate, formatTime } from '@/utils/gameUtils';

interface TeamAssignmentHeaderProps {
  kickoffDate: string;
  playerCount: number;
  playersPerTeam: number;
}

export function TeamAssignmentHeader({ kickoffDate, playerCount, playersPerTeam }: TeamAssignmentHeaderProps) {
  return (
    <View style={styles.header}>
      <ThemedTextBox variant="heading" weight="bold" color="primary">
        Assign Teams
      </ThemedTextBox>
      <ThemedTextBox variant="body" color="secondary" style={styles.subtitle}>
        {formatDate(kickoffDate)} at {formatTime(kickoffDate)}
      </ThemedTextBox>
      <ThemedTextBox variant="caption" color="secondary" style={styles.capacityNote}>
        {`Assigning ${playerCount} players (${playersPerTeam} per team)`}
      </ThemedTextBox>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 4,
  },
  capacityNote: {
    marginTop: 8,
  },
});
