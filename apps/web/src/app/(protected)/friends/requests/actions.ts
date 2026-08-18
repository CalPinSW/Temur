'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

export interface RequestActionResult {
  error?: string;
}

export async function acceptRequest(requestId: string): Promise<RequestActionResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('friend_id', user.id)
    .select('user_id')
    .single();

  if (error) return { error: 'Failed to accept request. Please try again.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single();

  const accepterName = profile?.display_name || profile?.username || 'Someone';

  await supabase.functions.invoke('send-notification', {
    body: {
      userId: data.user_id,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      body: `${accepterName} accepted your friend request`,
      data: { screen: 'Friends' },
    },
  });

  await trackEvent(AnalyticsEvent.FriendRequestAccepted);

  revalidatePath('/friends/requests');
  revalidatePath('/friends');
  return {};
}

export async function declineRequest(requestId: string): Promise<RequestActionResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', requestId)
    .eq('friend_id', user.id);

  if (error) return { error: 'Failed to decline request. Please try again.' };

  revalidatePath('/friends/requests');
  revalidatePath('/friends');
  return {};
}
