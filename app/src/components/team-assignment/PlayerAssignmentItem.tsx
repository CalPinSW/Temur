import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/theme';
import { ThemedTextBox } from '@/components/themed';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface PlayerAssignmentItemProps {
  playerName: string;
  position: number;
  currentTeam: number | null;
  onAssignTeam: (team: number | null) => void;
}

export function PlayerAssignmentItem({
  playerName,
  position,
  currentTeam,
  onAssignTeam,
}: PlayerAssignmentItemProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.playerItem, { borderBottomColor: colors.border }]}>
      <View style={styles.playerInfo}>
        <ThemedTextBox variant="body" color="primary" weight="medium">
          {`${position}. ${playerName}`}
        </ThemedTextBox>
      </View>

      <View style={styles.teamButtons}>
        {currentTeam !== null && (
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: colors.border }]}
            onPress={() => onAssignTeam(null)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.teamButton,
            { borderColor: colors.border },
            currentTeam === 1 && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
          ]}
          onPress={() => onAssignTeam(currentTeam === 1 ? null : 1)}
          activeOpacity={0.7}
        >
          <Text style={[styles.teamButtonText, currentTeam === 1 && styles.teamButtonTextActive]}>
            T1
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.teamButton,
            { borderColor: colors.border },
            currentTeam === 2 && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
          ]}
          onPress={() => onAssignTeam(currentTeam === 2 ? null : 2)}
          activeOpacity={0.7}
        >
          <Text style={[styles.teamButtonText, currentTeam === 2 && styles.teamButtonTextActive]}>
            T2
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
  },
  teamButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  teamButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  teamButtonTextActive: {
    color: '#FFFFFF',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
