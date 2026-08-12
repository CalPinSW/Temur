import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase';
import { Game, GameWithPlayers, PlayerGameWithProfile } from '@/types/game';

interface RawPlayerGame {
  id: string;
  user_id: string;
  signup_order: number;
  team: number | null;
  created_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  average_rating?: number;
  rating_count?: number;
}

interface RawGame extends Game {
  player_games: RawPlayerGame[];
}

interface RawRating {
  player_game_id: string;
  rating: number;
}

export function useGameDetails(gameId: string, userId?: string) {
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGameDetails = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: gameError } = await supabase
        .from('games')
        .select(
          `
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
        `
        )
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      const gameData = data as RawGame;
      const isPast = new Date(gameData.kickoff_date) < new Date();
      let playersWithRatings: RawPlayerGame[] = gameData.player_games || [];

      if (isPast) {
        const playerGameIds = playersWithRatings.map((pg) => pg.id);

        if (playerGameIds.length > 0) {
          const { data: ratingsData, error: ratingsError } = await supabase
            .from('player_ratings')
            .select('player_game_id, rating')
            .in('player_game_id', playerGameIds);

          if (!ratingsError && ratingsData) {
            const ratingsByPlayer = (ratingsData as RawRating[]).reduce<Record<string, number[]>>(
              (acc, rating) => {
                if (!acc[rating.player_game_id]) {
                  acc[rating.player_game_id] = [];
                }
                acc[rating.player_game_id].push(rating.rating);
                return acc;
              },
              {}
            );

            playersWithRatings = playersWithRatings.map((pg) => {
              const ratings = ratingsByPlayer[pg.id] || [];
              const average =
                ratings.length > 0
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

      playersWithRatings.sort((a, b) => a.signup_order - b.signup_order);

      const processedGame: GameWithPlayers = {
        ...gameData,
        // This query doesn't select board_x/board_y (only the team-assignment
        // screen needs those), so RawPlayerGame is a subset of PlayerGameWithProfile.
        player_games: playersWithRatings as unknown as PlayerGameWithProfile[],
        player_count: playersWithRatings.length,
        user_signed_up: playersWithRatings.some((pg) => pg.user_id === userId),
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
