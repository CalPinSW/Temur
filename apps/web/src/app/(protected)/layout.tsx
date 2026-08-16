import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { NavMenu } from './NavMenu';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();
  const [{ count: pendingRequestCount }, { count: pendingGroupInviteCount }] = await Promise.all([
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
        <NavMenu
          userId={user.id}
          pendingRequestCount={pendingRequestCount ?? 0}
          pendingGroupInviteCount={pendingGroupInviteCount ?? 0}
        />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
