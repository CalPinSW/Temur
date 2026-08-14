import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase';
import { Game, GameWithPlayers, PlayerGameWithProfile } from '@temur/shared';

interface RawPlayerGame {
  id: string;
  user_id: string | null;
  signup_order: number;
  team: number | null;
  created_at: string;
  is_ringer: boolean;
  guest_name: string | null;
  added_by: string | null;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  average_rating?: number;
  rating_count?: number;
}

interface RawGame extends Game {
  player_games: RawPlayerGame[];
}

interface RatingSummary {
  player_game_id: string;
  average_rating: number;
  rating_count: number;
}

export function useGameDetails(gameId: string, userId?: string) {
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGameDetails = useCallback(async () => {
    if (!userId) return;

    try {
      const [{ data, error: gameError }, { data: invitationData }] = await Promise.all([
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
            created_at,
            is_ringer,
            guest_name,
            added_by,
            profile:profiles!player_games_user_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `
          )
          .eq('id', gameId)
          .single(),
        supabase
          .from('game_invitations')
          .select('id, status')
          .eq('game_id', gameId)
          .eq('invited_user_id', userId)
          .maybeSingle(),
      ]);

      if (gameError) throw gameError;

      const gameData = data as RawGame;
      const isPast = new Date(gameData.kickoff_date) < new Date();
      let playersWithRatings: RawPlayerGame[] = gameData.player_games || [];

      if (isPast) {
        const playerGameIds = playersWithRatings.map((pg) => pg.id);

        if (playerGameIds.length > 0) {
          const { data: summaryData, error: summaryError } = await supabase.rpc(
            'get_player_rating_summary',
            { p_player_game_ids: playerGameIds }
          );

          if (!summaryError && summaryData) {
            const summaryByPlayer = new Map(
              (summaryData as RatingSummary[]).map((s) => [s.player_game_id, s])
            );

            playersWithRatings = playersWithRatings.map((pg) => {
              const summary = summaryByPlayer.get(pg.id);

              return {
                ...pg,
                average_rating: summary ? Number(summary.average_rating) : undefined,
                rating_count: summary ? summary.rating_count : 0,
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
        invitation_id: invitationData?.id,
        invitation_status: invitationData?.status,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
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
