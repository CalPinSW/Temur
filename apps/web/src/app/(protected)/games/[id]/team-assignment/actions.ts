'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { type SaveRow } from './teamAssignmentState';

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
