import { supabase } from './supabase';
import { NotificationTemplates } from './notificationService';

export async function inviteFriendsToGame(
  gameId: string,
  friendIds: string[],
  invitedBy: string,
  inviterName: string
): Promise<void> {
  if (friendIds.length === 0) return;

  const { error } = await supabase.from('game_invitations').insert(
    friendIds.map((invited_user_id) => ({
      game_id: gameId,
      invited_by: invitedBy,
      invited_user_id,
    }))
  );

  if (error) throw error;

  const notification = NotificationTemplates.gameInvite(inviterName, gameId);
  await Promise.all(
    friendIds.map((userId) =>
      supabase.functions.invoke('send-notification', {
        body: {
          userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
      })
    )
  );
}

export async function acceptGameInvitation(
  invitationId: string,
  gameId: string,
  userId: string,
  currentPlayerCount: number
): Promise<void> {
  const { error: updateError } = await supabase
    .from('game_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId);

  if (updateError) throw updateError;

  const { error: signupError } = await supabase.from('player_games').insert({
    game_id: gameId,
    user_id: userId,
    signup_order: currentPlayerCount + 1,
  });

  if (signupError) throw signupError;
}

export async function declineGameInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.from('game_invitations').delete().eq('id', invitationId);
  if (error) throw error;
}
