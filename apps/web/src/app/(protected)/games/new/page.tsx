import { type Profile } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { CreateGameForm } from './CreateGameForm';

interface RawFriendship {
  friend: Profile | Profile[];
}

export default async function CreateGamePage({
  searchParams,
}: PageProps<'/games/new'>) {
  const { group: presetGroupId } = await searchParams;
  const user = await getUser();
  const supabase = await createClient();

  const [
    { data: adminGroupRows },
    { data: sentFriendships },
    { data: receivedFriendships },
    { data: upcomingGames },
  ] = await Promise.all([
    supabase
      .from('group_members')
      .select('group:groups(id, name)')
      .eq('user_id', user!.id)
      .eq('role', 'admin'),
    supabase
      .from('friendships')
      .select('friend:profiles!friendships_friend_id_fkey(*)')
      .eq('user_id', user!.id)
      .eq('status', 'accepted'),
    supabase
      .from('friendships')
      .select('friend:profiles!friendships_user_id_fkey(*)')
      .eq('friend_id', user!.id)
      .eq('status', 'accepted'),
    supabase
      .from('games')
      .select('kickoff_date')
      .gte('kickoff_date', new Date().toISOString())
      .order('kickoff_date', { ascending: true }),
  ]);

  const adminGroups = (
    (adminGroupRows ?? []) as unknown as { group: { id: string; name: string } }[]
  ).map((row) => row.group);

  const toProfile = (item: RawFriendship) =>
    Array.isArray(item.friend) ? item.friend[0] : item.friend;
  const allFriends = [
    ...((sentFriendships as unknown as RawFriendship[]) ?? []),
    ...((receivedFriendships as unknown as RawFriendship[]) ?? []),
  ].map(toProfile);
  const friends = allFriends.filter(
    (friend, index, self) => index === self.findIndex((f) => f.id === friend.id)
  );

  const existingKickoffDates = (upcomingGames ?? []).map((g) => g.kickoff_date);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text">Create Game</h1>
        <p className="text-sm text-text-secondary">
          {presetGroupId
            ? "Only your group's members will see this game."
            : 'Choose whether to invite friends or scope this to a group.'}
        </p>
      </div>
      <CreateGameForm
        adminGroups={adminGroups}
        friends={friends}
        existingKickoffDates={existingKickoffDates}
        presetGroupId={typeof presetGroupId === 'string' ? presetGroupId : undefined}
      />
    </div>
  );
}
