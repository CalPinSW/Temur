import { supabase } from './supabase';
import { GameOutcome } from '@/types/game';

export type GameResultInput =
  | { type: 'score'; team1Score: number; team2Score: number }
  | { type: 'outcome'; outcome: GameOutcome };

export async function setGameResult(gameId: string, input: GameResultInput): Promise<void> {
  const params =
    input.type === 'score'
      ? { p_team1_score: input.team1Score, p_team2_score: input.team2Score, p_outcome: null }
      : { p_team1_score: null, p_team2_score: null, p_outcome: input.outcome };

  const { error } = await supabase.rpc('set_game_result', { p_game_id: gameId, ...params });

  if (error) throw error;
}
