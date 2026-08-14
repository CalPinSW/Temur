import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { Game, GameWithPlayers } from '@/types/game';

interface RawGame extends Game {
  player_games:
    | {
        id: string;
        user_id: string;
        signup_order: number;
        team: number | null;
        profile: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
        };
      }[]
    | null;
}

export function useGroupUpcomingGames(groupId: string, userId?: string) {
  const [upcomingGames, setUpcomingGames] = useState<GameWithPlayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .select(
          `
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
        `
        )
        .eq('group_id', groupId)
        .order('kickoff_date', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const processedGames: GameWithPlayers[] = ((data as RawGame[]) || [])
        .filter((game) => new Date(game.kickoff_date) >= now)
        .map((game) => ({
          ...game,
          player_games: game.player_games || [],
          player_count: game.player_games?.length || 0,
          user_signed_up: game.player_games?.some((pg) => pg.user_id === userId) || false,
        })) as GameWithPlayers[];

      setUpcomingGames(processedGames);
    } catch (error) {
      console.error('Error fetching group games:', error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, userId]);

  useEffect(() => {
    fetchGames();

    const channel = supabase
      .channel(`group-games-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `group_id=eq.${groupId}` },
        () => fetchGames()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_games' }, () =>
        fetchGames()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGames, groupId]);

  return { upcomingGames, isLoading, refetch: fetchGames };
}
