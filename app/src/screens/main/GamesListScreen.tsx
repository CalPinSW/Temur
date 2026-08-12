import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedTextBox } from '@/components/themed';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { GameWithPlayers } from '@/types/game';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { GameOverviewCard } from '@/components/game/GameOverviewCard';

interface GamesListScreenProps {
  onNavigateToGame: (gameId: string) => void;
}

export function GamesListScreen({ onNavigateToGame }: GamesListScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [upcomingGames, setUpcomingGames] = useState<GameWithPlayers[]>([]);
  const [historicGames, setHistoricGames] = useState<GameWithPlayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGames = useCallback(async () => {
    if (!user) return;

    try {
      const now = new Date().toISOString();

      const { data: games, error } = await supabase
        .from('games')
        .select(`
          *,
          player_games (
            id,
            user_id,
            signup_order,
            team,
            profile:profiles (
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .gte('visible_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('kickoff_date', { ascending: true });

      if (error) throw error;

      const processedGames: GameWithPlayers[] = (games || []).map((game) => ({
        ...game,
        player_games: game.player_games || [],
        player_count: game.player_games?.length || 0,
        user_signed_up: game.player_games?.some((pg: any) => pg.user_id === user.id) || false,
      }));

      const isAdmin = profile?.is_admin || false;
      const visibleGames = isAdmin
        ? processedGames
        : processedGames.filter((game) => new Date(game.visible_at) <= new Date());

      const upcoming = visibleGames.filter((game) => new Date(game.kickoff_date) >= new Date(now));
      const historic = visibleGames.filter((game) => new Date(game.kickoff_date) < new Date(now));

      setUpcomingGames(upcoming);
      setHistoricGames(historic.reverse());
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchGames();

    const channel = supabase
      .channel('games-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
        },
        () => {
          fetchGames();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_games',
        },
        () => {
          fetchGames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGames]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGames();
  };




  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <ThemedTextBox variant="heading" weight="bold" color="primary">
            Games
          </ThemedTextBox>
        </View>

        {upcomingGames.length > 0 && (
          <View style={styles.section}>
            <ThemedTextBox variant="subheading" weight="semibold" color="primary" style={styles.sectionTitle}>
              Upcoming Games
            </ThemedTextBox>
            {upcomingGames.map((game) => (
              <GameOverviewCard key={game.id} game={game} onNavigateToGame={onNavigateToGame} />
            ))}
          </View>
        )}

        {historicGames.length > 0 && (
          <View style={styles.section}>
            <ThemedTextBox variant="subheading" weight="semibold" color="primary" style={styles.sectionTitle}>
              Past Games
            </ThemedTextBox>
            {historicGames.map(game => (
              <GameOverviewCard key={game.id} game={game} onNavigateToGame={onNavigateToGame} />
            ))}
          </View>
        )}

        {!isLoading && upcomingGames.length === 0 && historicGames.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={64} color={colors.textTertiary} />
            <ThemedTextBox variant="body" color="secondary" style={styles.emptyText}>
              No games scheduled yet
            </ThemedTextBox>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
  },
});
