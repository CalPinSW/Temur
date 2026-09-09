import { notFound, redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { CreateSeriesForm } from './CreateSeriesForm';

export default async function NewSeriesPage({ params }: PageProps<'/groups/[id]/series/new'>) {
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text">Schedule recurring games — {group.name}</h1>
        <p className="text-sm text-text-secondary">
          Creates one game per week (or every few weeks) between the first kickoff and the end date.
          You can edit or cancel the upcoming games as a block afterwards.
        </p>
      </div>
      <CreateSeriesForm groupId={groupId} />
    </div>
  );
}
