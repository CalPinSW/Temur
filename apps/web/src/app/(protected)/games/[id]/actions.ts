'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getNextSignupOrder } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

export interface GameActionState {
  error?: string;
}

export async function signUpForGame(
  _prevState: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get('gameId') ?? '');
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();

  const { data: existingPlayers, error: fetchError } = await supabase
    .from('player_games')
    .select('signup_order')
    .eq('game_id', gameId);

  if (fetchError) {
    return { error: 'Failed to sign up. Please try again.' };
  }

  const nextSignupOrder = getNextSignupOrder(existingPlayers ?? []);

  const { error } = await supabase.from('player_games').insert({
    game_id: gameId,
    user_id: user.id,
    signup_order: nextSignupOrder,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'You are already signed up for this game.' };
    }
    return { error: 'Failed to sign up. Please try again.' };
  }

  revalidatePath(`/games/${gameId}`);
  revalidatePath('/games');
  return {};
}

export async function deleteGame(gameId: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_game', { p_game_id: gameId });

  if (error) {
    return { error: 'Failed to delete game. Please try again.' };
  }

  revalidatePath('/games');
  redirect('/games');
}

export async function withdrawFromGame(
  _prevState: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get('gameId') ?? '');
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('player_games')
    .delete()
    .eq('game_id', gameId)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Failed to withdraw. Please try again.' };
  }

  revalidatePath(`/games/${gameId}`);
  revalidatePath('/games');
  return {};
}
