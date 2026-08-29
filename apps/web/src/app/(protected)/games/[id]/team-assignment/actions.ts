'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';
import { type NotifyRecipient, type SaveRow } from './teamAssignmentState';

export interface SaveTeamAssignmentsResult {
  error?: string;
}

export async function saveTeamAssignments(
  gameId: string,
  rows: SaveRow[]
): Promise<SaveTeamAssignmentsResult> {
  const supabase = await createClient();

  for (const row of rows) {
    const { error } = await supabase
      .from('player_games')
      .update({ team: row.team, board_x: row.board_x, board_y: row.board_y })
      .eq('id', row.id);

    if (error) return { error: 'Failed to save team assignments. Please try again.' };
  }

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games/${gameId}/team-assignment`);
  return {};
}

export interface NotifyTeamAssignmentsResult {
  error?: string;
}

export async function notifyTeamAssignments(
  gameId: string,
  recipients: NotifyRecipient[],
  team1Name: string,
  team2Name: string,
  message: string
): Promise<NotifyTeamAssignmentsResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };
  if (recipients.length === 0) return { error: 'No players are assigned to a team yet.' };

  const supabase = await createClient();
  const trimmedMessage = message.trim();

  const results = await Promise.all(
    recipients.map(({ userId, team }) => {
      const teamName = team === 1 ? team1Name : team2Name;
      const suffix = `You're on ${teamName}`;
      const body = trimmedMessage ? `${trimmedMessage}\n\n${suffix}` : suffix;
      return supabase.functions.invoke('send-notification', {
        body: {
          userId,
          type: 'team_assigned',
          title: 'Team Assignment',
          body,
          data: { screen: 'GameDetail', gameId },
        },
      });
    })
  );

  if (results.some((result) => result.error)) {
    return { error: 'Failed to notify some players. Please try again.' };
  }

  return {};
}
