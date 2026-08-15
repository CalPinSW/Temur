'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface MemberActionResult {
  error?: string;
}

export async function updateMemberRole(
  groupId: string,
  memberId: string,
  role: 'admin' | 'member'
): Promise<MemberActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('group_members').update({ role }).eq('id', memberId);

  if (error) return { error: 'Failed to update role. Please try again.' };

  revalidatePath(`/groups/${groupId}/members`);
  return {};
}

export async function removeMember(
  groupId: string,
  memberId: string,
  memberUserId: string
): Promise<MemberActionResult> {
  const supabase = await createClient();

  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, kickoff_date')
    .eq('group_id', groupId);

  if (gamesError) return { error: 'Failed to remove member. Please try again.' };

  const now = new Date();
  const upcomingGameIds = (games ?? [])
    .filter((game) => new Date(game.kickoff_date) > now)
    .map((game) => game.id);

  if (upcomingGameIds.length > 0) {
    const { error: signupError } = await supabase
      .from('player_games')
      .delete()
      .eq('user_id', memberUserId)
      .in('game_id', upcomingGameIds);

    if (signupError) return { error: 'Failed to remove member. Please try again.' };
  }

  const { error } = await supabase.from('group_members').delete().eq('id', memberId);
  if (error) return { error: 'Failed to remove member. Please try again.' };

  revalidatePath(`/groups/${groupId}/members`);
  revalidatePath(`/groups/${groupId}`);
  return {};
}
