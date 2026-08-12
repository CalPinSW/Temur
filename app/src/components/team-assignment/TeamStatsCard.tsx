import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedButton } from '@/components/themed';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface TeamStatsCardProps {
  team1Name: string;
  team2Name: string;
  team1Count: number;
  team2Count: number;
  unassignedCount: number;
  onAutoAssign: () => void;
  onClearAll: () => void;
}

export function TeamStatsCard({
  team1Name,
  team2Name,
  team1Count,
  team2Count,
  unassignedCount,
  onAutoAssign,
  onClearAll,
}: TeamStatsCardProps) {
  const { colors } = useTheme();

  return (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.teamIndicator, { backgroundColor: '#3B82F6' }]} />
          <ThemedTextBox variant="body" color="primary">
            {`${team1Name}: ${team1Count}`}
          </ThemedTextBox>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.teamIndicator, { backgroundColor: '#EF4444' }]} />
          <ThemedTextBox variant="body" color="primary">
            {`${team2Name}: ${team2Count}`}
          </ThemedTextBox>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="help-outline" size={20} color={colors.textSecondary} />
          <ThemedTextBox variant="body" color="secondary">
            {`Unassigned: ${unassignedCount}`}
          </ThemedTextBox>
        </View>
      </View>

      <View style={styles.quickActions}>
        <ThemedButton
          title="Auto-Assign (Alternate)"
          variant="secondary"
          size="small"
          onPress={onAutoAssign}
          style={styles.quickActionButton}
        />
        <ThemedButton
          title="Clear All"
          variant="ghost"
          size="small"
          onPress={onClearAll}
          style={styles.quickActionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
  },
});
