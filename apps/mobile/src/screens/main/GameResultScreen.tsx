import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  ThemedTextBox,
  ThemedCard,
  ThemedButton,
  ThemedDropdown,
  DropdownOption,
} from '@/components/themed';
import { GameResultSection, PlayerAvatar } from '@/components/game';
import { useAuthStore } from '@/store/authStore';
import { useGameDetails } from '@/hooks/useGameDetails';
import { usePlayerRatings } from '@/hooks/usePlayerRatings';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { PlayerGameWithProfile, formatDate, getPlayerDisplayName } from '@temur/shared';

interface GameResultScreenProps {
  gameId: string;
  onGoBack: () => void;
}

const RATING_OPTIONS: DropdownOption<number | undefined>[] = [
  { label: 'No rating', value: undefined },
  ...Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), value: i + 1 })),
];

export function GameResultScreen({ gameId, onGoBack }: GameResultScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { game, isLoading, refetch } = useGameDetails(gameId, user?.id);
  const { refreshing, onRefresh } = useRefreshControl(refetch);

  const ratablePlayers = (game?.player_games ?? []).filter((pg) => pg.user_id !== user?.id);
  const ratablePlayerIds = ratablePlayers.map((pg) => pg.id);
  const hasTeams = ratablePlayers.some((pg) => pg.team !== null);

  const {
    ratings,
    setRating,
    saveRatings,
    isLoading: isLoadingRatings,
    isSaving: isSavingRatings,
  } = usePlayerRatings(gameId, ratablePlayerIds, user?.id);

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

  const renderRatingRow = (pg: PlayerGameWithProfile) => (
    <View key={pg.id} style={styles.ratingRow}>
      <PlayerAvatar avatarUrl={pg.profile?.avatar_url} displayName={getPlayerDisplayName(pg)} />
      <ThemedTextBox variant="body" color="primary" style={styles.ratingName}>
        {getPlayerDisplayName(pg)}
      </ThemedTextBox>
      <View style={styles.ratingDropdown}>
        <ThemedDropdown
          value={ratings[pg.id]}
          options={RATING_OPTIONS}
          onChange={(value) => setRating(pg.id, value)}
          placeholder="Rate"
        />
      </View>
    </View>
  );

  const renderTeamGroup = (title: string, players: PlayerGameWithProfile[]) =>
    players.length > 0 && (
      <View style={styles.teamGroup} key={title}>
        <ThemedTextBox
          variant="subheading"
          weight="semibold"
          color="primary"
          style={styles.teamTitle}
        >
          {title}
        </ThemedTextBox>
        {players.map(renderRatingRow)}
      </View>
    );

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <ThemedCard variant="elevated" title="Result">
          <ThemedTextBox variant="caption" color="secondary" style={styles.dateText}>
            {formatDate(game.kickoff_date)}
          </ThemedTextBox>
          <GameResultSection
            gameId={gameId}
            team1Name={game.team1_name}
            team2Name={game.team2_name}
            resultTeam1Score={game.result_team1_score}
            resultTeam2Score={game.result_team2_score}
            resultOutcome={game.result_outcome}
            onSaved={refetch}
          />
        </ThemedCard>

        {ratablePlayers.length > 0 && (
          <ThemedCard variant="elevated" title="Rate Players">
            <ThemedTextBox variant="caption" color="secondary" style={styles.ratingsHint}>
              Optional — rate each player from 1 to 10. Only you can see your own ratings.
            </ThemedTextBox>

            {hasTeams ? (
              <>
                {renderTeamGroup(
                  game.team1_name,
                  ratablePlayers.filter((pg) => pg.team === 1)
                )}
                {renderTeamGroup(
                  game.team2_name,
                  ratablePlayers.filter((pg) => pg.team === 2)
                )}
                {renderTeamGroup(
                  'Unassigned',
                  ratablePlayers.filter((pg) => pg.team === null)
                )}
              </>
            ) : (
              ratablePlayers.map(renderRatingRow)
            )}

            <ThemedButton
              title={isSavingRatings ? 'Saving...' : 'Save Ratings'}
              variant="primary"
              onPress={() => saveRatings(refetch)}
              disabled={isSavingRatings || isLoadingRatings}
              style={styles.saveRatingsButton}
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
    gap: 16,
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
  dateText: {
    marginBottom: 4,
  },
  ratingsHint: {
    marginBottom: 8,
  },
  teamGroup: {
    marginBottom: 16,
  },
  teamTitle: {
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  ratingName: {
    flex: 1,
  },
  ratingDropdown: {
    width: 130,
  },
  saveRatingsButton: {
    marginTop: 12,
  },
});
