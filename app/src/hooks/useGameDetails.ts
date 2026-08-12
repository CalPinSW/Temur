import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase';
import { GameWithPlayers } from '@/types/game';

export function useGameDetails(gameId: string, userId?: string) {
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGameDetails = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          player_games (
            id,
            user_id,
            signup_order,
            team,
            created_at,
            profile:profiles (
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      const isPast = new Date(gameData.kickoff_date) < new Date();
      let playersWithRatings = gameData.player_games || [];

      if (isPast) {
        const playerGameIds = playersWithRatings.map((pg: any) => pg.id);

        if (playerGameIds.length > 0) {
          const { data: ratingsData, error: ratingsError } = await supabase
            .from('player_ratings')
            .select('player_game_id, rating')
            .in('player_game_id', playerGameIds);

          if (!ratingsError && ratingsData) {
            const ratingsByPlayer = ratingsData.reduce((acc: any, rating: any) => {
              if (!acc[rating.player_game_id]) {
                acc[rating.player_game_id] = [];
              }
              acc[rating.player_game_id].push(rating.rating);
              return acc;
            }, {});

            playersWithRatings = playersWithRatings.map((pg: any) => {
              const ratings = ratingsByPlayer[pg.id] || [];
              const average = ratings.length > 0
                ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
                : undefined;

              return {
                ...pg,
                average_rating: average,
                rating_count: ratings.length,
              };
            });
          }
        }
      }

      playersWithRatings.sort((a: any, b: any) => a.signup_order - b.signup_order);

      const processedGame: GameWithPlayers = {
        ...gameData,
        player_games: playersWithRatings,
        player_count: playersWithRatings.length,
        user_signed_up: playersWithRatings.some((pg: any) => pg.user_id === userId),
      };

      setGame(processedGame);
    } catch (error) {
      console.error('Error fetching game details:', error);
      Alert.alert('Error', 'Failed to load game details');
    } finally {
      setIsLoading(false);
    }
  }, [gameId, userId]);

  useEffect(() => {
    fetchGameDetails();

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_games',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchGameDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGameDetails, gameId]);

  return { game, isLoading, refetch: fetchGameDetails };
}
