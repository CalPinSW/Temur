import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedCard, ThemedButton, ThemedToggle } from '@/components/themed';
import { useTeamAssignment } from '@/hooks/useTeamAssignment';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { getTeamCounts, getPlayerDisplayName } from '@temur/shared';
import {
  TeamAssignmentHeader,
  TeamStatsCard,
  PlayerAssignmentItem,
  TeamAssignmentBoard,
} from '@/components/team-assignment';

interface TeamAssignmentScreenProps {
  gameId: string;
  onGoBack: () => void;
}

export function TeamAssignmentScreen({ gameId, onGoBack }: TeamAssignmentScreenProps) {
  const { colors } = useTheme();
  const {
    game,
    isLoading,
    isSaving,
    isDirty,
    teamAssignments,
    boardPositions,
    handleAssignTeam,
    handleMoveOnBoard,
    handleAutoAssign,
    handleClearAll,
    handleSave,
    refetch,
  } = useTeamAssignment(gameId);
  const [boardView, setBoardView] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const handlePullRefresh = useCallback(() => {
    if (!isDirty) return refetch();

    return new Promise<void>((resolve) => {
      Alert.alert(
        'Discard unsaved changes?',
        'Refreshing will discard your unsaved team assignment changes.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Discard & Refresh',
            style: 'destructive',
            onPress: async () => {
              await refetch();
              resolve();
            },
          },
        ]
      );
    });
  }, [isDirty, refetch]);
  const { refreshing, onRefresh } = useRefreshControl(handlePullRefresh);

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!game) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.errorContainer}>
          <ThemedTextBox variant="body" color="secondary">
            Game not found
          </ThemedTextBox>
          <ThemedButton title="Go Back" variant="primary" onPress={onGoBack} />
        </View>
      </SafeAreaView>
    );
  }

  const teamCounts = getTeamCounts(teamAssignments);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <ThemedButton title="← Back" variant="ghost" onPress={onGoBack} style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={scrollEnabled}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {!boardView && (
          <>
            <TeamAssignmentHeader
              kickoffDate={game.kickoff_date}
              playerCount={game.player_count}
              playersPerTeam={game.players_per_team}
            />

            <ThemedCard variant="elevated">
              <TeamStatsCard
                team1Name={game.team1_name}
                team2Name={game.team2_name}
                team1Count={teamCounts.team1}
                team2Count={teamCounts.team2}
                unassignedCount={teamCounts.unassigned}
                onAutoAssign={handleAutoAssign}
                onClearAll={handleClearAll}
              />
            </ThemedCard>
          </>
        )}

        <ThemedCard variant="elevated">
          <ThemedToggle value={boardView} onValueChange={setBoardView} label="Board view" />
        </ThemedCard>

        {boardView ? (
          <TeamAssignmentBoard
            players={game.player_games}
            teamAssignments={teamAssignments}
            boardPositions={boardPositions}
            team1Name={game.team1_name}
            team2Name={game.team2_name}
            onMovePlayer={handleMoveOnBoard}
            onDragActiveChange={(active) => setScrollEnabled(!active)}
          />
        ) : (
          <ThemedCard variant="elevated" title="Players">
            <View style={styles.playersList}>
              {game.player_games.map((playerGame, index) => (
                <PlayerAssignmentItem
                  key={playerGame.id}
                  playerName={
                    getPlayerDisplayName(playerGame) + (playerGame.is_ringer ? ' (Ringer)' : '')
                  }
                  position={index + 1}
                  currentTeam={teamAssignments[playerGame.id]}
                  onAssignTeam={(team) => handleAssignTeam(playerGame.id, team)}
                />
              ))}
            </View>
          </ThemedCard>
        )}

        <View style={styles.saveButtonContainer}>
          <ThemedButton
            title={isSaving ? 'Saving...' : 'Save Team Assignments'}
            variant="primary"
            onPress={() => handleSave(onGoBack)}
            disabled={isSaving}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  playersList: {
    gap: 0,
  },
  saveButtonContainer: {
    marginTop: 24,
  },
});
