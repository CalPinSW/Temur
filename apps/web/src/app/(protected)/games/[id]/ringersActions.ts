'use server';

import { revalidatePath } from 'next/cache';
import { getNextSignupOrder } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

export interface RingerActionResult {
  error?: string;
}

export async function openGameToRingers(
  gameId: string,
  groupId: string,
  message: string
): Promise<RingerActionResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();

  const { error } = await supabase
    .from('games')
    .update({ ringers_opened_at: new Date().toISOString(), ringers_opened_by: user.id })
    .eq('id', gameId);

  if (error) return { error: 'Failed to open game to ringers. Please try again.' };

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  const body = message.trim()
    ? message.trim()
    : 'This game is now open to ringers — add one if you know someone who can play.';

  await Promise.all(
    (members ?? []).map((member) =>
      supabase.functions.invoke('send-notification', {
        body: {
          userId: member.user_id,
          type: 'ringers_open',
          title: 'Ringers needed!',
          body,
          data: { screen: 'GameDetail', gameId },
        },
      })
    )
  );

  revalidatePath(`/games/${gameId}`);
  return {};
}

export async function addRinger(gameId: string, name: string): Promise<RingerActionResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Enter a name.' };

  const supabase = await createClient();

  const { data: existingPlayers, error: fetchError } = await supabase
    .from('player_games')
    .select('signup_order')
    .eq('game_id', gameId);

  if (fetchError) return { error: 'Failed to add ringer. Please try again.' };

  const nextSignupOrder = getNextSignupOrder(existingPlayers ?? []);

  const { error } = await supabase.from('player_games').insert({
    game_id: gameId,
    is_ringer: true,
    guest_name: trimmedName,
    added_by: user.id,
    signup_order: nextSignupOrder,
  });

  if (error) return { error: 'Failed to add ringer. Please try again.' };

  await supabase
    .from('saved_ringers')
    .upsert({ user_id: user.id, name: trimmedName }, { onConflict: 'user_id,name' });

  revalidatePath(`/games/${gameId}`);
  return {};
}

export async function removeRinger(
  gameId: string,
  playerGameId: string
): Promise<RingerActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('player_games').delete().eq('id', playerGameId);

  if (error) return { error: 'Failed to remove ringer. Please try again.' };

  revalidatePath(`/games/${gameId}`);
  return {};
}

export async function getSavedRingerNames(): Promise<string[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('saved_ringers')
    .select('name')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return (data ?? []).map((r) => r.name);
}
