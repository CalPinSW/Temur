import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { signOut } from './actions';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border-light px-4 py-3">
        <Link href="/games" className="text-lg font-semibold text-text">
          Temur
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/friends" className="text-sm text-text-secondary hover:text-text">
            Friends
          </Link>
          <Link href="/groups" className="text-sm text-text-secondary hover:text-text">
            Groups
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
