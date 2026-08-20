import { notFound, redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { InviteSearch } from './InviteSearch';
import { JoinLinkCard } from './JoinLinkCard';

export default async function InviteToGroupPage({ params }: PageProps<'/groups/[id]/invite'>) {
  const { id: groupId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data: group, error: groupError }, { data: members, error: membersError }] =
    await Promise.all([
      supabase.from('groups').select('id, name').eq('id', groupId).single(),
      supabase.from('group_members').select('user_id, role').eq('group_id', groupId),
    ]);

  if (groupError || !group) notFound();
  if (membersError) throw membersError;

  const isAdmin = (members ?? []).some((m) => m.user_id === user.id && m.role === 'admin');
  if (!isAdmin) redirect(`/groups/${groupId}`);

  const existingMemberIds = (members ?? []).map((m) => m.user_id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Invite Players to {group.name}</h1>
      <JoinLinkCard groupId={groupId} />
      <InviteSearch groupId={groupId} existingMemberIds={existingMemberIds} />
    </div>
  );
}
