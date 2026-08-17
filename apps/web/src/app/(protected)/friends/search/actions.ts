'use server';

import { type Profile, type FriendshipStatus, getFriendshipStatuses } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

export interface SearchResult extends Profile {
  friendshipStatus: FriendshipStatus;
}

export async function searchUsers(query: string): Promise<SearchResult[]> {
  const user = await getUser();
  if (!user || query.trim().length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq('id', user.id)
    .limit(20);

  if (error) return [];
  const profiles = data as Profile[];
  if (profiles.length === 0) return [];

  const ids = profiles.map((p) => p.id);
  const { data: friendships } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .or(
      `and(user_id.eq.${user.id},friend_id.in.(${ids.join(',')})),` +
        `and(friend_id.eq.${user.id},user_id.in.(${ids.join(',')}))`
    );

  const statuses = getFriendshipStatuses(friendships ?? [], user.id);
  return profiles.map((profile) => ({
    ...profile,
    friendshipStatus: statuses.get(profile.id) ?? 'none',
  }));
}

export interface SendRequestResult {
  error?: string;
}

export async function sendFriendRequest(friendId: string): Promise<SendRequestResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase.from('friendships').insert({
    user_id: user.id,
    friend_id: friendId,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') {
      return { error: "You're already friends, or a request is already pending." };
    }
    return { error: 'Failed to send friend request. Please try again.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single();

  const senderName = profile?.display_name || profile?.username || 'Someone';

  await supabase.functions.invoke('send-notification', {
    body: {
      userId: friendId,
      type: 'friend_request',
      title: 'New Friend Request',
      body: `${senderName} wants to be your friend`,
      data: { screen: 'FriendRequests' },
    },
  });

  await trackEvent(AnalyticsEvent.FriendRequestSent);

  return {};
}
