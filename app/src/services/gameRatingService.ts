import { supabase } from './supabase';

export async function getMyRatings(
  playerGameIds: string[],
  ratedBy: string
): Promise<Record<string, number>> {
  if (playerGameIds.length === 0) return {};

  const { data, error } = await supabase
    .from('player_ratings')
    .select('player_game_id, rating')
    .eq('rated_by', ratedBy)
    .in('player_game_id', playerGameIds);

  if (error) throw error;

  return Object.fromEntries(
    ((data as { player_game_id: string; rating: number }[]) || []).map((r) => [
      r.player_game_id,
      r.rating,
    ])
  );
}

export async function submitRatings(
  ratings: { playerGameId: string; rating: number }[],
  ratedBy: string
): Promise<void> {
  if (ratings.length === 0) return;

  const { error } = await supabase.from('player_ratings').upsert(
    ratings.map((r) => ({
      player_game_id: r.playerGameId,
      rating: r.rating,
      rated_by: ratedBy,
    })),
    { onConflict: 'player_game_id,rated_by' }
  );

  if (error) throw error;
}
