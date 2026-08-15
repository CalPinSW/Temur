import { notFound, redirect } from 'next/navigation';
import { type GroupMemberWithProfile } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { MembersList } from './MembersList';

export default async function GroupMembersPage({ params }: PageProps<'/groups/[id]/members'>) {
  const { id: groupId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data: group, error: groupError }, { data: membersData, error: membersError }] =
    await Promise.all([
      supabase.from('groups').select('id, name').eq('id', groupId).single(),
      supabase
        .from('group_members')
        .select(
          'id, group_id, user_id, role, created_at, updated_at, profile:profiles(id, username, display_name, avatar_url)'
        )
        .eq('group_id', groupId),
    ]);

  if (groupError || !group) notFound();
  if (membersError) throw membersError;

  const members = (membersData ?? []) as unknown as GroupMemberWithProfile[];
  const myMembership = members.find((m) => m.user_id === user.id);
  const isAdmin = myMembership?.role === 'admin';

  const sorted = [...members].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
    return (a.profile.display_name || a.profile.username).localeCompare(
      b.profile.display_name || b.profile.username
    );
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Members</h1>
      <MembersList
        groupId={groupId}
        groupName={group.name}
        currentUserId={user.id}
        isAdmin={isAdmin}
        initialMembers={sorted}
      />
    </div>
  );
}
