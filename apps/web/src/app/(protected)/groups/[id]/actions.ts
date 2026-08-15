'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';

export interface UpdateGroupInput {
  name: string;
  description: string;
  messageTemplate: string;
}

export async function updateGroup(
  groupId: string,
  input: UpdateGroupInput
): Promise<{ error?: string }> {
  const name = input.name.trim();
  const description = input.description.trim();
  const messageTemplate = input.messageTemplate.trim();

  if (!name) {
    return { error: 'Group name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('groups')
    .update({
      name,
      description: description || null,
      team_assignment_message_template: messageTemplate || null,
    })
    .eq('id', groupId);

  if (error) {
    return { error: 'Failed to update group. Please try again.' };
  }

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function leaveGroup(groupId: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();

  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, kickoff_date')
    .eq('group_id', groupId);

  if (gamesError) return { error: 'Failed to leave group. Please try again.' };

  const now = new Date();
  const upcomingGameIds = (games ?? [])
    .filter((game) => new Date(game.kickoff_date) > now)
    .map((game) => game.id);

  if (upcomingGameIds.length > 0) {
    const { error: signupError } = await supabase
      .from('player_games')
      .delete()
      .eq('user_id', user.id)
      .in('game_id', upcomingGameIds);

    if (signupError) return { error: 'Failed to leave group. Please try again.' };
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  if (error) return { error: 'Failed to leave group. Please try again.' };

  redirect('/groups');
}
