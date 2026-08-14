import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedButton } from '@/components/themed';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useGroupAdminGroupIds } from '@/hooks/useGroupAdminGroupIds';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { Game, GameWithPlayers } from '@/types/game';
import { isGameAdmin } from '@/utils/gameUtils';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { GameOverviewCard } from '@/components/game/GameOverviewCard';

interface GamesListScreenProps {
  onNavigateToGame: (gameId: string) => void;
  onNavigateToCreateGame: () => void;
}

interface RawGame extends Game {
  player_games:
    | {
        id: string;
        user_id: string | null;
        signup_order: number;
        team: number | null;
        profile: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
        } | null;
      }[]
    | null;
}

interface RawInvitation {
  game_id: string;
  status: 'pending' | 'accepted';
}

export function GamesListScreen({
  onNavigateToGame,
  onNavigateToCreateGame,
}: GamesListScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { adminGroupIds } = useGroupAdminGroupIds(user?.id);
  const [upcomingGames, setUpcomingGames] = useState<GameWithPlayers[]>([]);
  const [historicGames, setHistoricGames] = useState<GameWithPlayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    if (!user) return;

    try {
      const now = new Date().toISOString();

      const [{ data: games, error }, { data: invitations }] = await Promise.all([
        supabase
          .from('games')
          .select(
            `
          *,
          player_games (
            id,
            user_id,
            signup_order,
            team,
            profile:profiles!player_games_user_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `
          )
          .gte('visible_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('kickoff_date', { ascending: true }),
        supabase.from('game_invitations').select('game_id, status').eq('invited_user_id', user.id),
      ]);

      if (error) throw error;

      const invitationByGameId = new Map(
        ((invitations as RawInvitation[]) || []).map((inv) => [inv.game_id, inv.status])
      );

      const processedGames: GameWithPlayers[] = ((games as RawGame[]) || []).map((game) => ({
        ...game,
        player_games: game.player_games || [],
        player_count: game.player_games?.length || 0,
        user_signed_up: game.player_games?.some((pg) => pg.user_id === user.id) || false,
        invitation_status: invitationByGameId.get(game.id),
      })) as GameWithPlayers[];

      const visibleGames = processedGames.filter((game) => {
        if (isGameAdmin(game, user.id, adminGroupIds)) return true;
        return new Date(game.visible_at) <= new Date();
      });

      const upcoming = visibleGames.filter((game) => new Date(game.kickoff_date) >= new Date(now));
      const historic = visibleGames.filter((game) => new Date(game.kickoff_date) < new Date(now));

      setUpcomingGames(upcoming);
      setHistoricGames(historic.reverse());
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, adminGroupIds]);

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
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

  const { refreshing, onRefresh } = useRefreshControl(fetchGames);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <ThemedTextBox variant="heading" weight="bold" color="primary">
            Games
          </ThemedTextBox>
          <ThemedButton
            variant="ghost"
            onPress={onNavigateToCreateGame}
            title="+"
            textStyle={styles.addIcon}
          />
        </View>

        {upcomingGames.length > 0 && (
          <View style={styles.section}>
            <ThemedTextBox
              variant="subheading"
              weight="semibold"
              color="primary"
              style={styles.sectionTitle}
            >
              Upcoming Games
            </ThemedTextBox>
            {upcomingGames.map((game) => (
              <GameOverviewCard key={game.id} game={game} onNavigateToGame={onNavigateToGame} />
            ))}
          </View>
        )}

        {historicGames.length > 0 && (
          <View style={styles.section}>
            <ThemedTextBox
              variant="subheading"
              weight="semibold"
              color="primary"
              style={styles.sectionTitle}
            >
              Past Games
            </ThemedTextBox>
            {historicGames.map((game) => (
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  addIcon: {
    fontSize: 28,
    fontWeight: '300',
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
