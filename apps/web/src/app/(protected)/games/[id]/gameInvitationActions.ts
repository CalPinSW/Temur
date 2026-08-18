'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';

export interface GameInvitationActionResult {
  error?: string;
}

export async function inviteFriendsToGame(
  gameId: string,
  friendIds: string[]
): Promise<GameInvitationActionResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };
  if (friendIds.length === 0) return {};

  const supabase = await createClient();

  const { error } = await supabase.from('game_invitations').insert(
    friendIds.map((invited_user_id) => ({
      game_id: gameId,
      invited_by: user.id,
      invited_user_id,
    }))
  );

  if (error) return { error: 'Failed to send invites. Please try again.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single();
  const inviterName = profile?.display_name || profile?.username || 'Someone';

  await Promise.all(
    friendIds.map((userId) =>
      supabase.functions.invoke('send-notification', {
        body: {
          userId,
          type: 'game_invite',
          title: 'New Game Invite',
          body: `${inviterName} invited you to a game`,
          data: { screen: 'GameDetail', gameId },
        },
      })
    )
  );

  revalidatePath(`/games/${gameId}`);
  return {};
}
