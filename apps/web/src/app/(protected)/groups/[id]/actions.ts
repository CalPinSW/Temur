'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { MAX_TEAM_SHEET_TEMPLATE_LENGTH, normalizeTeamSheetTemplateForSave } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

export interface UpdateGroupInput {
  name: string;
  description: string;
  messageTemplate: string;
  teamSheetTemplate: string;
  singleTeam: boolean;
}

export async function updateGroup(
  groupId: string,
  input: UpdateGroupInput
): Promise<{ error?: string }> {
  const name = input.name.trim();
  const description = input.description.trim();
  const messageTemplate = input.messageTemplate.trim();
  const teamSheetTemplate = normalizeTeamSheetTemplateForSave(
    input.teamSheetTemplate,
    input.singleTeam
  );

  if (!name) {
    return { error: 'Group name is required.' };
  }
  if ((teamSheetTemplate?.length ?? 0) > MAX_TEAM_SHEET_TEMPLATE_LENGTH) {
    return {
      error: `Team sheet message must be ${MAX_TEAM_SHEET_TEMPLATE_LENGTH} characters or fewer.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('groups')
    .update({
      name,
      description: description || null,
      team_assignment_message_template: messageTemplate || null,
      team_sheet_message_template: teamSheetTemplate,
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

export async function deleteGroup(groupId: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_group', { p_group_id: groupId });

  if (error) {
    return { error: 'Failed to delete group. Please try again.' };
  }

  revalidatePath('/groups');
  redirect('/groups');
}
