import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase';
import { GameWithPlayers } from '@/types/game';
import { getGameCapacity, getActivePlayers } from '@/utils/gameUtils';

export function useTeamAssignment(gameId: string) {
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState<Record<string, number | null>>({});

  const fetchGameDetails = useCallback(async () => {
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

      const allPlayers = (gameData.player_games || []).sort(
        (a: any, b: any) => a.signup_order - b.signup_order
      );

      const capacity = getGameCapacity(gameData.players_per_team);
      const activePlayers = getActivePlayers(allPlayers, capacity);

      const processedGame: GameWithPlayers = {
        ...gameData,
        player_games: activePlayers,
        player_count: activePlayers.length,
        user_signed_up: false,
      };

      setGame(processedGame);

      const assignments: Record<string, number | null> = {};
      activePlayers.forEach((pg: any) => {
        assignments[pg.id] = pg.team;
      });
      setTeamAssignments(assignments);
    } catch (error) {
      console.error('Error fetching game details:', error);
      Alert.alert('Error', 'Failed to load game details');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchGameDetails();
  }, [fetchGameDetails]);

  const handleAssignTeam = (playerGameId: string, team: number | null) => {
    setTeamAssignments((prev) => ({
      ...prev,
      [playerGameId]: team,
    }));
  };

  const handleAutoAssign = () => {
    if (!game) return;

    const players = game.player_games;
    const newAssignments: Record<string, number | null> = {};

    players.forEach((pg, index) => {
      newAssignments[pg.id] = (index % 2) + 1;
    });

    setTeamAssignments(newAssignments);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Assignments',
      'Are you sure you want to clear all team assignments?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            if (!game) return;
            const newAssignments: Record<string, number | null> = {};
            game.player_games.forEach((pg) => {
              newAssignments[pg.id] = null;
            });
            setTeamAssignments(newAssignments);
          },
        },
      ]
    );
  };

  const handleSave = async (onSuccess: () => void) => {
    if (!game) return;

    try {
      setIsSaving(true);

      const updates = game.player_games.map((pg) => ({
        id: pg.id,
        team: teamAssignments[pg.id],
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('player_games')
          .update({ team: update.team })
          .eq('id', update.id);

        if (error) throw error;
      }

      Alert.alert('Success', 'Team assignments saved successfully!', [
        {
          text: 'OK',
          onPress: onSuccess,
        },
      ]);
    } catch (error) {
      console.error('Error saving team assignments:', error);
      Alert.alert('Error', 'Failed to save team assignments. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    game,
    isLoading,
    isSaving,
    teamAssignments,
    handleAssignTeam,
    handleAutoAssign,
    handleClearAll,
    handleSave,
  };
}
