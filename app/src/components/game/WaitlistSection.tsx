import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { ThemedTextBox } from '@/components/themed';
import { PlayerGameWithProfile } from '@/types/game';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PlayersList } from './PlayersList';
import { getVisiblePlayers } from '@/utils/gameUtils';

interface WaitlistSectionProps {
  players: PlayerGameWithProfile[];
  capacity: number;
  currentUserId?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isAdmin?: boolean;
  onRemoveRinger?: (playerGameId: string) => void;
}

export function WaitlistSection({
  players,
  capacity,
  currentUserId,
  isExpanded,
  onToggleExpand,
  isAdmin,
  onRemoveRinger,
}: WaitlistSectionProps) {
  const { colors } = useTheme();
  const waitlistPlayers = getVisiblePlayers(
    players,
    capacity,
    isExpanded,
    currentUserId,
    undefined,
    true
  );

  return (
    <View>
      <View style={styles.waitlistNotice}>
        <MaterialIcons name="info-outline" size={20} color={colors.textSecondary} />
        <ThemedTextBox variant="caption" color="secondary" style={styles.waitlistNoticeText}>
          These players will be added to the game if spots become available
        </ThemedTextBox>
      </View>
      <PlayersList
        players={waitlistPlayers}
        currentUserId={currentUserId}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        isAdmin={isAdmin}
        onRemoveRinger={onRemoveRinger}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  waitlistNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  waitlistNoticeText: {
    flex: 1,
  },
});
