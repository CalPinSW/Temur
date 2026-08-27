import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedTextBox } from '@/components/themed';
import { PlayerGameWithProfile, getActivePlayers } from '@temur/shared';
import { PlayersList } from './PlayersList';

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
  const team1Players = activePlayers.filter((p) => p.team === 1);
  const team2Players = activePlayers.filter((p) => p.team === 2);
  const unassignedPlayers = activePlayers.filter((p) => p.team === null);

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
