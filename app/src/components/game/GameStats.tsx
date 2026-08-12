import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { ThemedTextBox } from '@/components/themed';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface GameStatsProps {
  activePlayersCount: number;
  capacity: number;
  waitlistCount: number;
}

export function GameStats({ activePlayersCount, capacity, waitlistCount }: GameStatsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.gameStats}>
      <View style={styles.statItem}>
        <MaterialIcons name="people" size={24} color={colors.textSecondary} />
        <ThemedTextBox variant="body" color="secondary">
          {`${activePlayersCount}/${capacity} players`}
        </ThemedTextBox>
      </View>
      {waitlistCount > 0 && (
        <View style={styles.statItem}>
          <MaterialIcons name="schedule" size={24} color={colors.textSecondary} />
          <ThemedTextBox variant="body" color="secondary">
            {`${waitlistCount} on waitlist`}
          </ThemedTextBox>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gameStats: {
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
