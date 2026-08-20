import Link from 'next/link';
import { redirect } from 'next/navigation';
import { type GroupJoinLinkInfo } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

function InvalidLinkMessage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-text">Link invalid or expired</h1>
      <p className="max-w-sm text-text-secondary">
        This join link is no longer valid. Ask a group admin to send you a new one.
      </p>
      <Link href="/games" className="font-medium text-primary hover:text-primary-hover">
        Go to Temur
      </Link>
    </main>
  );
}

export default async function JoinGroupPage({ params }: PageProps<'/groups/join/[token]'>) {
  const { token } = await params;
  const user = await getUser();
  const supabase = await createClient();

  if (user) {
    const { data: groupId, error } = await supabase.rpc('join_group_via_link', {
      p_token: token,
    });

    if (error || !groupId) return <InvalidLinkMessage />;
    redirect(`/groups/${groupId}`);
  }

  const { data, error } = await supabase
    .rpc('get_group_join_link_info', { p_token: token })
    .single();

  if (error || !data) return <InvalidLinkMessage />;
  const info = data as GroupJoinLinkInfo;
  const redirectPath = `/groups/join/${token}`;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-text">Join {info.group_name}</h1>
      <p className="max-w-sm text-text-secondary">
        Sign up or log in to join {info.group_name} on Temur.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link
          href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}
          className="rounded-lg bg-primary px-4 py-2 text-center font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Sign up to join
        </Link>
        <Link
          href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
          className="rounded-lg border border-primary px-4 py-2 text-center font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Log in to join
        </Link>
      </div>
    </main>
  );
}
