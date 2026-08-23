'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getNextSignupOrder, getGameCapacity, isVisibleAtBeforeKickoff } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

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

  const [
    { data: existingPlayers, error: fetchError },
    { data: game, error: gameError },
  ] = await Promise.all([
    supabase.from('player_games').select('signup_order').eq('game_id', gameId),
    supabase.from('games').select('players_per_team').eq('id', gameId).single(),
  ]);

  if (fetchError || gameError) {
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

  const capacity = getGameCapacity(game.players_per_team);
  await trackEvent(AnalyticsEvent.SignedUpForGame, {
    waitlisted: nextSignupOrder > capacity,
  });

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

export interface UpdateGameInput {
  gameDescription: string;
  kickoffDate: string;
  visibleAt: string;
  team1Name: string;
  team2Name: string;
  playersPerTeam: number;
}

export async function updateGame(
  gameId: string,
  input: UpdateGameInput
): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  if (!isVisibleAtBeforeKickoff(new Date(input.kickoffDate), new Date(input.visibleAt))) {
    return { error: '"Visible From" must be before the kickoff time.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('games')
    .update({
      game_description: input.gameDescription || null,
      kickoff_date: input.kickoffDate,
      visible_at: input.visibleAt,
      team1_name: input.team1Name,
      team2_name: input.team2Name,
      players_per_team: input.playersPerTeam,
    })
    .eq('id', gameId)
    .select('id')
    .single();

  if (error || !data) return { error: 'Failed to save changes. Please try again.' };

  revalidatePath(`/games/${gameId}`);
  revalidatePath('/games');
  redirect(`/games/${gameId}`);
}

export async function publishGameNow(gameId: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('games')
    .update({ visible_at: new Date().toISOString() })
    .eq('id', gameId);

  if (error) {
    return {
      error:
        "Failed to publish game. If its kickoff time has already passed, edit that first — visible date can't be after kickoff.",
    };
  }

  revalidatePath(`/games/${gameId}`);
  revalidatePath('/games');
  return {};
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

  await trackEvent(AnalyticsEvent.WithdrewFromGame);

  revalidatePath(`/games/${gameId}`);
  revalidatePath('/games');
  return {};
}
