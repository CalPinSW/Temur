import { supabase } from './supabase';
import { SavedRinger } from '@temur/shared';

export async function openGameToRingers(gameId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({ ringers_opened_at: new Date().toISOString(), ringers_opened_by: userId })
    .eq('id', gameId);

  if (error) throw error;
}

export async function addRinger(
  gameId: string,
  name: string,
  addedBy: string,
  signupOrder: number
): Promise<void> {
  const { error } = await supabase.from('player_games').insert({
    game_id: gameId,
    is_ringer: true,
    guest_name: name.trim(),
    added_by: addedBy,
    signup_order: signupOrder,
  });

  if (error) throw error;
}

export async function removeRinger(playerGameId: string): Promise<void> {
  const { error } = await supabase.from('player_games').delete().eq('id', playerGameId);

  if (error) throw error;
}

export async function getSavedRingers(userId: string): Promise<SavedRinger[]> {
  const { data, error } = await supabase
    .from('saved_ringers')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveRingerName(userId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('saved_ringers')
    .upsert({ user_id: userId, name: name.trim() }, { onConflict: 'user_id,name' });

  if (error) throw error;
}

export async function deleteSavedRinger(ringerId: string): Promise<void> {
  const { error } = await supabase.from('saved_ringers').delete().eq('id', ringerId);

  if (error) throw error;
}
