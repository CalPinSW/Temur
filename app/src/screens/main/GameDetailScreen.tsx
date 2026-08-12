import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedCard, ThemedButton } from '@/components/themed';
import { useAuthStore } from '@/store/authStore';
import { useGameDetails } from '@/hooks/useGameDetails';
import { useGameActions } from '@/hooks/useGameActions';
import {
  getGameCapacity,
  getActivePlayers,
  getWaitlistPlayers,
  getVisiblePlayers,
} from '@/utils/gameUtils';
import {
  GameHeader,
  GameStats,
  GameActions,
  PlayersList,
  TeamsSection,
  WaitlistSection,
} from '@/components/game';

interface GameDetailScreenProps {
  gameId: string;
  onGoBack: () => void;
  onNavigateToTeamAssignment?: (gameId: string) => void;
}

export function GameDetailScreen({
  gameId,
  onGoBack,
  onNavigateToTeamAssignment,
}: GameDetailScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [isPlayersExpanded, setIsPlayersExpanded] = useState(false);

  const { game, isLoading, refetch } = useGameDetails(gameId, user?.id);
  const { isSigningUp, isWithdrawing, handleSignUp, handleWithdraw } = useGameActions(
    gameId,
    user?.id
  );

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

  const isPast = new Date(game.kickoff_date) < new Date();
  const isVisible = new Date(game.visible_at) <= new Date();
  const hasTeams = game.player_games.some((pg) => pg.team !== null);
  const capacity = getGameCapacity(game.players_per_team);
  const activePlayers = getActivePlayers(game.player_games, capacity);
  const waitlistPlayers = getWaitlistPlayers(game.player_games, capacity);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <ThemedButton title="← Back" variant="ghost" onPress={onGoBack} style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ThemedCard variant="elevated">
          <GameHeader kickoffDate={game.kickoff_date} isPast={isPast} isVisible={isVisible} />

          <GameStats
            activePlayersCount={activePlayers.length}
            capacity={capacity}
            waitlistCount={waitlistPlayers.length}
          />

          {!isPast && isVisible && (
            <GameActions
              isUserSignedUp={game.user_signed_up}
              isSigningUp={isSigningUp}
              isWithdrawing={isWithdrawing}
              onSignUp={() => handleSignUp(game, refetch)}
              onWithdraw={() => handleWithdraw(game, refetch)}
              isAdmin={profile?.is_admin}
              hasPlayers={game.player_count > 0}
              onNavigateToTeamAssignment={
                onNavigateToTeamAssignment ? () => onNavigateToTeamAssignment(gameId) : undefined
              }
            />
          )}
        </ThemedCard>

        {activePlayers.length > 0 && (
          <ThemedCard variant="elevated" title={hasTeams ? 'Teams' : 'Players'}>
            {hasTeams ? (
              <TeamsSection
                players={game.player_games}
                capacity={capacity}
                team1Name={game.team1_name}
                team2Name={game.team2_name}
                currentUserId={user?.id}
                isExpanded={isPlayersExpanded}
                onToggleExpand={() => setIsPlayersExpanded(!isPlayersExpanded)}
              />
            ) : (
              <PlayersList
                players={getVisiblePlayers(
                  game.player_games,
                  capacity,
                  isPlayersExpanded,
                  user?.id,
                  undefined,
                  false
                )}
                currentUserId={user?.id}
                isExpanded={isPlayersExpanded}
                onToggleExpand={() => setIsPlayersExpanded(!isPlayersExpanded)}
              />
            )}
          </ThemedCard>
        )}

        {waitlistPlayers.length > 0 && (
          <ThemedCard variant="elevated" title="Waitlist">
            <WaitlistSection
              players={game.player_games}
              capacity={capacity}
              currentUserId={user?.id}
              isExpanded={isPlayersExpanded}
              onToggleExpand={() => setIsPlayersExpanded(!isPlayersExpanded)}
            />
          </ThemedCard>
        )}
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
});
