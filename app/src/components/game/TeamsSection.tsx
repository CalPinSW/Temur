import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedTextBox } from '@/components/themed';
import { PlayerGameWithProfile } from '@/types/game';
import { PlayersList } from './PlayersList';
import { getActivePlayers, getVisiblePlayers } from '@/utils/gameUtils';

interface TeamsSectionProps {
  players: PlayerGameWithProfile[];
  capacity: number;
  team1Name: string;
  team2Name: string;
  currentUserId?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isAdmin?: boolean;
  onRemoveRinger?: (playerGameId: string, ringerName: string) => void;
}

export function TeamsSection({
  players,
  capacity,
  team1Name,
  team2Name,
  currentUserId,
  isExpanded,
  onToggleExpand,
  isAdmin,
  onRemoveRinger,
}: TeamsSectionProps) {
  const activePlayers = getActivePlayers(players, capacity);
  const team1Players = getVisiblePlayers(players, capacity, isExpanded, currentUserId, 1, false);
  const team2Players = getVisiblePlayers(players, capacity, isExpanded, currentUserId, 2, false);
  const unassignedPlayers = getVisiblePlayers(
    players,
    capacity,
    isExpanded,
    currentUserId,
    undefined,
    false
  );

  return (
    <View>
      <View style={styles.teamSection}>
        <ThemedTextBox
          variant="subheading"
          weight="semibold"
          color="primary"
          style={styles.teamTitle}
        >
          {team1Name}
        </ThemedTextBox>
        <PlayersList
          players={team1Players}
          currentUserId={currentUserId}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          isAdmin={isAdmin}
          onRemoveRinger={onRemoveRinger}
        />
      </View>

      <View style={styles.teamSection}>
        <ThemedTextBox
          variant="subheading"
          weight="semibold"
          color="primary"
          style={styles.teamTitle}
        >
          {team2Name}
        </ThemedTextBox>
        <PlayersList
          players={team2Players}
          currentUserId={currentUserId}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          isAdmin={isAdmin}
          onRemoveRinger={onRemoveRinger}
        />
      </View>

      {activePlayers.some((pg) => pg.team === null) && (
        <View style={styles.teamSection}>
          <ThemedTextBox
            variant="subheading"
            weight="semibold"
            color="secondary"
            style={styles.teamTitle}
          >
            Unassigned
          </ThemedTextBox>
          <PlayersList
            players={unassignedPlayers}
            currentUserId={currentUserId}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            isAdmin={isAdmin}
            onRemoveRinger={onRemoveRinger}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  teamSection: {
    marginBottom: 24,
  },
  teamTitle: {
    marginBottom: 12,
  },
});
