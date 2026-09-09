'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MAX_SERIES_GAMES, generateSeriesKickoffs, getVisibleAtWithLead } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

export interface SeriesActionState {
  error?: string;
}

export interface CreateGameSeriesInput {
  groupId: string;
  firstKickoff: string; // ISO
  endDate: string; // ISO (a calendar day; time part ignored by generateSeriesKickoffs)
  intervalWeeks: number;
  visibleLeadDays: number;
  team1Name: string;
  team2Name: string;
  playersPerTeam: number;
}

export async function createGameSeries(input: CreateGameSeriesInput): Promise<SeriesActionState> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const first = new Date(input.firstKickoff);
  const end = new Date(input.endDate);
  if (Number.isNaN(first.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Enter a valid first kickoff and end date.' };
  }

  const kickoffs = generateSeriesKickoffs(first, end, input.intervalWeeks);
  if (kickoffs.length < 2) {
    return {
      error: 'That range only covers one game — pick a later end date.',
    };
  }
  if (kickoffs.length > MAX_SERIES_GAMES) {
    return {
      error: `A recurring block can have at most ${MAX_SERIES_GAMES} games.`,
    };
  }

  const visibleAts = kickoffs.map((k) => getVisibleAtWithLead(k, input.visibleLeadDays));

  const supabase = await createClient();
  const { error } = await supabase.rpc('create_game_series', {
    p_group_id: input.groupId,
    p_interval_weeks: input.intervalWeeks,
    p_kickoffs: kickoffs.map((d) => d.toISOString()),
    p_visible_ats: visibleAts.map((d) => d.toISOString()),
    p_team1_name: input.team1Name,
    p_team2_name: input.team2Name,
    p_players_per_team: input.playersPerTeam,
  });

  if (error) {
    return { error: 'Failed to schedule the games. Please try again.' };
  }

  await trackEvent(AnalyticsEvent.GameSeriesCreated, {
    intervalWeeks: input.intervalWeeks,
    gameCount: kickoffs.length,
  });

  revalidatePath(`/groups/${input.groupId}/games`);
  revalidatePath(`/groups/${input.groupId}`);
  redirect(`/groups/${input.groupId}/games`);
}

export interface UpdateGameSeriesInput {
  seriesId: string;
  groupId: string;
  kickoffTime: string; // "HH:mm"
  visibleLeadDays: number;
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

  const [hh, mm] = input.kickoffTime.split(':').map(Number);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) {
    return { error: 'Enter a valid kickoff time.' };
  }

  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const { data: games, error: fetchError } = await supabase
    .from('games')
    .select('id, kickoff_date')
    .eq('series_id', input.seriesId)
    .is('deleted_at', null)
    .gte('kickoff_date', nowIso)
    .order('kickoff_date', { ascending: true });

  if (fetchError) return { error: 'Failed to load the block. Please try again.' };
  if (!games || games.length === 0) {
    return { error: 'This block has no upcoming games left to edit.' };
  }

  // Keep each game's own date, apply the new wall-clock time.
  const kickoffs: string[] = [];
  const visibleAts: string[] = [];
  for (const g of games) {
    const d = new Date(g.kickoff_date);
    d.setHours(hh, mm, 0, 0);
    kickoffs.push(d.toISOString());
    visibleAts.push(getVisibleAtWithLead(d, input.visibleLeadDays).toISOString());
  }

  const { error } = await supabase.rpc('update_game_series_future', {
    p_series_id: input.seriesId,
    p_game_ids: games.map((g) => g.id),
    p_kickoffs: kickoffs,
    p_visible_ats: visibleAts,
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
