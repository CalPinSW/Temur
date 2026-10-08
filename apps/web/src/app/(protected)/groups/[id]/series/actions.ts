'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MAX_SERIES_GAMES, isVisibleAtBeforeKickoff } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

export interface SeriesActionState {
  error?: string;
}

// Kickoff and visible-from timestamps are computed in the browser, since
// they're wall-clock times in the admin's own timezone and this server
// runs in UTC.
interface SeriesSchedule {
  kickoffs: string[];
  visibleAts: string[];
}

const getScheduleError = ({ kickoffs, visibleAts }: SeriesSchedule): string | null => {
  if (kickoffs.length !== visibleAts.length) return 'Enter a valid schedule.';
  const pairs = kickoffs.map((k, i) => [new Date(k), new Date(visibleAts[i])] as const);
  if (pairs.some(([k, v]) => Number.isNaN(k.getTime()) || Number.isNaN(v.getTime()))) {
    return 'Enter a valid schedule.';
  }
  if (pairs.some(([k, v]) => !isVisibleAtBeforeKickoff(k, v))) {
    return 'Each game must become visible before it kicks off.';
  }
  return null;
};

export interface CreateGameSeriesInput extends SeriesSchedule {
  groupId: string;
  intervalWeeks: number;
  team1Name: string;
  team2Name: string;
  playersPerTeam: number;
}

export async function createGameSeries(input: CreateGameSeriesInput): Promise<SeriesActionState> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const scheduleError = getScheduleError(input);
  if (scheduleError) return { error: scheduleError };
  if (input.kickoffs.length < 2) {
    return {
      error: 'That range only covers one game — pick a later end date.',
    };
  }
  if (input.kickoffs.length > MAX_SERIES_GAMES) {
    return {
      error: `A recurring block can have at most ${MAX_SERIES_GAMES} games.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('create_game_series', {
    p_group_id: input.groupId,
    p_interval_weeks: input.intervalWeeks,
    p_kickoffs: input.kickoffs,
    p_visible_ats: input.visibleAts,
    p_team1_name: input.team1Name,
    p_team2_name: input.team2Name,
    p_players_per_team: input.playersPerTeam,
  });

  if (error) {
    return { error: 'Failed to schedule the games. Please try again.' };
  }

  await trackEvent(AnalyticsEvent.GameSeriesCreated, {
    intervalWeeks: input.intervalWeeks,
    gameCount: input.kickoffs.length,
  });

  revalidatePath(`/groups/${input.groupId}/games`);
  revalidatePath(`/groups/${input.groupId}`);
  redirect(`/groups/${input.groupId}/games`);
}

export interface UpdateGameSeriesInput extends SeriesSchedule {
  seriesId: string;
  groupId: string;
  gameIds: string[];
  team1Name: string;
  team2Name: string;
  playersPerTeam: number;
  gameDescription: string;
}

export async function updateGameSeriesFuture(
  input: UpdateGameSeriesInput
): Promise<SeriesActionState> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const scheduleError = getScheduleError(input);
  if (scheduleError) return { error: scheduleError };
  if (input.gameIds.length === 0 || input.gameIds.length !== input.kickoffs.length) {
    return { error: 'This block has no upcoming games left to edit.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('update_game_series_future', {
    p_series_id: input.seriesId,
    p_game_ids: input.gameIds,
    p_kickoffs: input.kickoffs,
    p_visible_ats: input.visibleAts,
    p_team1_name: input.team1Name,
    p_team2_name: input.team2Name,
    p_players_per_team: input.playersPerTeam,
    p_game_description: input.gameDescription || null,
  });

  if (error) return { error: 'Failed to update the block. Please try again.' };

  revalidatePath(`/groups/${input.groupId}/games`);
  revalidatePath(`/groups/${input.groupId}`);
  redirect(`/groups/${input.groupId}/games`);
}

export async function cancelGameSeries(
  seriesId: string,
  groupId: string
): Promise<SeriesActionState> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_game_series', {
    p_series_id: seriesId,
  });

  if (error) return { error: 'Failed to cancel the block. Please try again.' };

  revalidatePath(`/groups/${groupId}/games`);
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}/games`);
}
