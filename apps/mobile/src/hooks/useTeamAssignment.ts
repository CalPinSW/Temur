import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase';
import {
  Game,
  GameWithPlayers,
  BoardPosition,
  PlayerGameWithProfile,
  getGameCapacity,
  getActivePlayers,
} from '@temur/shared';

interface RawPlayerGame {
  id: string;
  user_id: string | null;
  signup_order: number;
  team: number | null;
  board_x: number | null;
  board_y: number | null;
  is_ringer: boolean;
  guest_name: string | null;
  added_by: string | null;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface RawGame extends Game {
  player_games: RawPlayerGame[];
}

export function useTeamAssignment(gameId: string) {
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState<Record<string, number | null>>({});
  const [boardPositions, setBoardPositions] = useState<Record<string, BoardPosition | null>>({});
  const [isDirty, setIsDirty] = useState(false);

  const fetchGameDetails = useCallback(async () => {
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
            board_x,
            board_y,
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
        .single();

      if (gameError) throw gameError;

      const gameData = data as RawGame;
      const allPlayers = (gameData.player_games || []).sort(
        (a, b) => a.signup_order - b.signup_order
      );

      const capacity = getGameCapacity(gameData.players_per_team);
      // This query doesn't select game_id/created_at/updated_at (only the game
      // detail screen needs those), so RawPlayerGame is a subset of PlayerGameWithProfile.
      const activePlayers = getActivePlayers(
        allPlayers as unknown as PlayerGameWithProfile[],
        capacity
      );

      const processedGame: GameWithPlayers = {
        ...gameData,
        player_games: activePlayers,
        player_count: activePlayers.length,
        user_signed_up: false,
      };

      setGame(processedGame);

      const assignments: Record<string, number | null> = {};
      const positions: Record<string, BoardPosition | null> = {};
      activePlayers.forEach((pg) => {
        assignments[pg.id] = pg.team;
        positions[pg.id] =
          pg.board_x !== null && pg.board_y !== null ? { x: pg.board_x, y: pg.board_y } : null;
      });
      setTeamAssignments(assignments);
      setBoardPositions(positions);
      setIsDirty(false);
    } catch (error) {
      console.error('Error fetching game details:', error);
      Alert.alert('Error', 'Failed to load game details');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    const load = () => fetchGameDetails();
    load();
  }, [fetchGameDetails]);

  const handleAssignTeam = (playerGameId: string, team: number | null) => {
    setTeamAssignments((prev) => ({
      ...prev,
      [playerGameId]: team,
    }));
    setBoardPositions((prev) => ({
      ...prev,
      [playerGameId]: null,
    }));
    setIsDirty(true);
  };

  const handleMoveOnBoard = (
    playerGameId: string,
    team: number | null,
    position: BoardPosition | null
  ) => {
    setTeamAssignments((prev) => ({
      ...prev,
      [playerGameId]: team,
    }));
    setBoardPositions((prev) => ({
      ...prev,
      [playerGameId]: position,
    }));
    setIsDirty(true);
  };

  const handleAutoAssign = () => {
    if (!game) return;

    const players = game.player_games;
    const newAssignments: Record<string, number | null> = {};
    const newPositions: Record<string, BoardPosition | null> = {};

    players.forEach((pg, index) => {
      newAssignments[pg.id] = (index % 2) + 1;
      newPositions[pg.id] = null;
    });

    setTeamAssignments(newAssignments);
    setBoardPositions(newPositions);
    setIsDirty(true);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Assignments', 'Are you sure you want to clear all team assignments?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          if (!game) return;
          const newAssignments: Record<string, number | null> = {};
          const newPositions: Record<string, BoardPosition | null> = {};
          game.player_games.forEach((pg) => {
            newAssignments[pg.id] = null;
            newPositions[pg.id] = null;
          });
          setTeamAssignments(newAssignments);
          setBoardPositions(newPositions);
          setIsDirty(true);
        },
      },
    ]);
  };

  const handleSave = async (onSuccess: () => void) => {
    if (!game) return;

    try {
      setIsSaving(true);

      const updates = game.player_games.map((pg) => ({
        id: pg.id,
        team: teamAssignments[pg.id],
        board_x: boardPositions[pg.id]?.x ?? null,
        board_y: boardPositions[pg.id]?.y ?? null,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('player_games')
          .update({ team: update.team, board_x: update.board_x, board_y: update.board_y })
          .eq('id', update.id);

        if (error) throw error;
      }

      setIsDirty(false);
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
    isDirty,
    teamAssignments,
    boardPositions,
    handleAssignTeam,
    handleMoveOnBoard,
    handleAutoAssign,
    handleClearAll,
    handleSave,
    refetch: fetchGameDetails,
  };
}
