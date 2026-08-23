import { supabase } from './supabase';
import { NotificationTemplates } from './notificationService';
import { GameJoinLink } from '@temur/shared';

// Matches the fallback default in supabase/functions/_shared/email.ts —
// there's no EXPO_PUBLIC_SITE_URL env var on mobile today, so this is
// hardcoded the same way that server-side fallback is (see groupService.ts's
// WEB_URL for the group-join-link equivalent).
const WEB_URL = 'https://www.temur.app';

export async function getOrCreateGameJoinLink(gameId: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('get_or_create_game_join_link', { p_game_id: gameId })
    .single();

  if (error || !data) throw error ?? new Error('Failed to create join link');
  return `${WEB_URL}/games/join/${(data as GameJoinLink).token}`;
}

export async function joinGameViaLink(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_game_via_link', { p_token: token });
  if (error || !data) throw error ?? new Error('This join link is invalid or has expired');
  return data as string;
}

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
  signupOrder: number
): Promise<void> {
  const { error: updateError } = await supabase
    .from('game_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId);

  if (updateError) throw updateError;

  const { error: signupError } = await supabase.from('player_games').insert({
    game_id: gameId,
    user_id: userId,
    signup_order: signupOrder,
  });

  if (signupError) throw signupError;
}

export async function declineGameInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.from('game_invitations').delete().eq('id', invitationId);
  if (error) throw error;
}
