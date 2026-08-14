import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox } from '@/components/themed';
import { GameOverviewCard } from '@/components/game/GameOverviewCard';
import { useGroupUpcomingGames } from '@/hooks/useGroupUpcomingGames';
import { useAuthStore } from '@/store/authStore';
import { GameWithPlayers } from '@temur/shared';

interface GroupGamesScreenProps {
  groupId: string;
  onGoBack: () => void;
  onNavigateToGame: (gameId: string) => void;
}

export function GroupGamesScreen({ groupId, onGoBack, onNavigateToGame }: GroupGamesScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { upcomingGames, isLoading } = useGroupUpcomingGames(groupId, user?.id);

  const renderGame = ({ item }: { item: GameWithPlayers }) => (
    <GameOverviewCard game={item} onNavigateToGame={onNavigateToGame} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedTextBox variant="subheading" weight="semibold" align="center">
        No upcoming games
      </ThemedTextBox>
      <View style={styles.emptySubtextContainer}>
        <ThemedTextBox variant="body" color="secondary" align="center">
          This group doesn&apos;t have any games scheduled yet
        </ThemedTextBox>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton variant="ghost" onPress={onGoBack} title="← Back" />
        <ThemedTextBox variant="subheading" weight="semibold">
          Upcoming Games
        </ThemedTextBox>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={upcomingGames}
          keyExtractor={(item) => item.id}
          renderItem={renderGame}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={upcomingGames.length === 0 ? styles.emptyList : styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  placeholder: {
    width: 50,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptySubtextContainer: {
    marginTop: 8,
  },
});
