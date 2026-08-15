import Link from 'next/link';
import { redirect } from 'next/navigation';
import { type Profile, getInitials } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { RemoveFriendButton } from './RemoveFriendButton';

interface Friendship {
  id: string;
  friend: Profile;
}

async function loadFriends(userId: string) {
  const supabase = await createClient();

  const [{ data: sentData, error: sentError }, { data: receivedData, error: receivedError }] =
    await Promise.all([
      supabase
        .from('friendships')
        .select('id, friend:profiles!friendships_friend_id_fkey(*)')
        .eq('user_id', userId)
        .eq('status', 'accepted'),
      supabase
        .from('friendships')
        .select('id, friend:profiles!friendships_user_id_fkey(*)')
        .eq('friend_id', userId)
        .eq('status', 'accepted'),
    ]);

  if (sentError || receivedError) throw sentError ?? receivedError;

  const all = [...(sentData ?? []), ...(receivedData ?? [])] as unknown as Friendship[];
  return all.filter(
    (friendship, index, self) =>
      index === self.findIndex((f) => f.friend?.id === friendship.friend?.id)
  );
}

export default async function FriendsPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [friends, { count: pendingCount }] = await Promise.all([
    loadFriends(user.id),
    supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', user.id)
      .eq('status', 'pending'),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Friends</h1>
        <Link
          href="/friends/search"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          + Add
        </Link>
      </div>

      {!!pendingCount && (
        <Link
          href="/friends/requests"
          className="flex items-center justify-between rounded-lg bg-background-secondary px-4 py-3 transition-colors hover:bg-input"
        >
          <span className="font-medium text-text">
            {pendingCount} pending friend request{pendingCount > 1 ? 's' : ''}
          </span>
          <span className="text-primary">›</span>
        </Link>
      )}

      <Link
        href="/friends/ringers"
        className="flex items-center justify-between rounded-lg bg-background-secondary px-4 py-3 transition-colors hover:bg-input"
      >
        <span className="font-medium text-text">Manage saved ringers</span>
        <span className="text-primary">›</span>
      </Link>

      {friends.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No friends yet.{' '}
          <Link href="/friends/search" className="font-medium text-primary hover:text-primary-hover">
            Search for users
          </Link>{' '}
          to add them.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border bg-card">
          {friends.map((friendship) => (
            <div key={friendship.id} className="flex items-center gap-3 px-4 py-3">
              {friendship.friend.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
                <img
                  src={friendship.friend.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {getInitials(friendship.friend.display_name, friendship.friend.username)}
                </div>
              )}
              <div className="flex flex-1 flex-col">
                <span className="font-medium text-text">
                  {friendship.friend.display_name || friendship.friend.username}
                </span>
                <span className="text-sm text-text-secondary">@{friendship.friend.username}</span>
              </div>
              <RemoveFriendButton
                friendId={friendship.friend.id}
                friendName={friendship.friend.display_name || friendship.friend.username || ''}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
