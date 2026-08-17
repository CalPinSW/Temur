'use server';

import { revalidatePath } from 'next/cache';
import { type GameOutcome } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

export interface ResultActionResult {
  error?: string;
}

export async function setGameResultScore(
  gameId: string,
  team1Score: number,
  team2Score: number
): Promise<ResultActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_game_result', {
    p_game_id: gameId,
    p_team1_score: team1Score,
    p_team2_score: team2Score,
    p_outcome: null,
  });

  if (error) return { error: 'Failed to save result. Please try again.' };

  await trackEvent(AnalyticsEvent.GameResultSubmitted, { method: 'score' });

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games/${gameId}/result`);
  return {};
}

export async function setGameResultOutcome(
  gameId: string,
  outcome: GameOutcome
): Promise<ResultActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_game_result', {
    p_game_id: gameId,
    p_team1_score: null,
    p_team2_score: null,
    p_outcome: outcome,
  });

  if (error) return { error: 'Failed to save result. Please try again.' };

  await trackEvent(AnalyticsEvent.GameResultSubmitted, { method: 'outcome' });

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games/${gameId}/result`);
  return {};
}

export async function submitRatings(
  gameId: string,
  ratings: { playerGameId: string; rating: number }[]
): Promise<ResultActionResult> {
  if (ratings.length === 0) return {};

  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase.from('player_ratings').upsert(
    ratings.map((r) => ({
      player_game_id: r.playerGameId,
      rating: r.rating,
      rated_by: user.id,
    })),
    { onConflict: 'player_game_id,rated_by' }
  );

  if (error) return { error: 'Failed to save ratings. Please try again.' };

  await trackEvent(AnalyticsEvent.PlayerRated, { count: ratings.length });

  revalidatePath(`/games/${gameId}/result`);
  return {};
}
