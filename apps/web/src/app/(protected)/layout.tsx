import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { RealtimeBadge } from './RealtimeBadge';
import { signOut } from './actions';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();
  const [{ data: profile }, { count: pendingRequestCount }, { count: pendingGroupInviteCount }] =
    await Promise.all([
      supabase.from('profiles').select('username, display_name').eq('id', user.id).single(),
      supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending'),
      supabase
        .from('group_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_user_id', user.id),
    ]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border-light px-4 py-3">
        <Link href="/games" className="text-lg font-semibold text-text">
          Temur
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/friends"
            className="flex items-center text-sm text-text-secondary hover:text-text"
          >
            Friends
            <RealtimeBadge
              channelName="friend-requests-badge"
              table="friendships"
              filters={[
                { column: 'friend_id', value: user.id },
                { column: 'status', value: 'pending' },
              ]}
              initialCount={pendingRequestCount ?? 0}
            />
          </Link>
          <Link
            href="/groups"
            className="flex items-center text-sm text-text-secondary hover:text-text"
          >
            Groups
            <RealtimeBadge
              channelName="group-invites-badge"
              table="group_invitations"
              filters={[{ column: 'invited_user_id', value: user.id }]}
              initialCount={pendingGroupInviteCount ?? 0}
            />
          </Link>
          <Link href="/profile" className="text-sm text-text-secondary hover:text-text">
            {profile?.display_name || profile?.username}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-text-secondary hover:text-text"
            >
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
