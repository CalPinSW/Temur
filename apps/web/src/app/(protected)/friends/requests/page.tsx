import { type Profile } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { RequestsList, type FriendRequest } from './RequestsList';

interface RawRequest {
  id: string;
  requester: Profile | Profile[];
}

export default async function FriendRequestsPage() {
  const user = await getUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester:profiles!friendships_user_id_fkey(*)')
    .eq('friend_id', user!.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const requests: FriendRequest[] = ((data as RawRequest[]) ?? []).map((item) => ({
    id: item.id,
    requester: Array.isArray(item.requester) ? item.requester[0] : item.requester,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Friend Requests</h1>
      <RequestsList initialRequests={requests} />
    </div>
  );
}
