'use server';

import { redirect } from 'next/navigation';
import { isVisibleAtBeforeKickoff } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

export interface CreateGameState {
  error?: string;
}

export interface CreateGameInput {
  mode: 'friends' | 'group';
  groupId: string | null;
  friendIds: string[];
  kickoffDate: string;
  visibleAt: string;
  team1Name: string;
  team2Name: string;
  playersPerTeam: number;
}

export async function createGame(input: CreateGameInput): Promise<CreateGameState> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  if (input.mode === 'group' && !input.groupId) {
    return { error: 'Choose which group this game is for.' };
  }

  if (!isVisibleAtBeforeKickoff(new Date(input.kickoffDate), new Date(input.visibleAt))) {
    return { error: '"Visible From" must be before the kickoff time.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .insert({
      kickoff_date: input.kickoffDate,
      visible_at: input.visibleAt,
      team1_name: input.team1Name,
      team2_name: input.team2Name,
      players_per_team: input.playersPerTeam,
      group_id: input.mode === 'group' ? input.groupId : null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) return { error: 'Failed to create game. Please try again.' };

  if (input.mode === 'friends' && input.friendIds.length > 0) {
    const { error: inviteError } = await supabase.from('game_invitations').insert(
      input.friendIds.map((invited_user_id) => ({
        game_id: data.id,
        invited_by: user.id,
        invited_user_id,
      }))
    );

    if (!inviteError) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single();
      const inviterName = profile?.display_name || profile?.username || 'Someone';

      await Promise.all(
        input.friendIds.map((userId) =>
          supabase.functions.invoke('send-notification', {
            body: {
              userId,
              type: 'game_invite',
              title: 'New Game Invite',
              body: `${inviterName} invited you to a game`,
              data: { screen: 'GameDetail', gameId: data.id },
            },
          })
        )
      );
    }
  }

  await trackEvent(AnalyticsEvent.GameCreated, {
    mode: input.mode,
    playersPerTeam: input.playersPerTeam,
    invitedFriendCount: input.friendIds.length,
  });

  // A game visible_at in the future still shows the creator a working
  // signup form on the detail page (visibility gating only exists on the
  // games list, which greys these out as non-clickable) — land back on the
  // list instead of walking straight into a page you shouldn't be able to
  // reach yet.
  if (new Date(input.visibleAt) > new Date()) {
    redirect('/games');
  }

  redirect(`/games/${data.id}`);
}
