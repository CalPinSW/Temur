import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { formatDate, formatTime, type Group, type GroupMemberWithProfile } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { EditGroupCard } from './EditGroupCard';
import { LeaveGroupButton } from './LeaveGroupButton';

export default async function GroupDetailPage({ params }: PageProps<'/groups/[id]'>) {
  const { id: groupId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data: group, error: groupError }, { data: membersData, error: membersError }] =
    await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
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

  const { data: upcomingGames } = await supabase
    .from('games')
    .select('id, kickoff_date')
    .eq('group_id', groupId)
    .gte('kickoff_date', new Date().toISOString())
    .order('kickoff_date', { ascending: true });

  const games = upcomingGames ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <EditGroupCard
        groupId={groupId}
        name={(group as Group).name}
        description={(group as Group).description ?? ''}
        messageTemplate={(group as Group).team_assignment_message_template ?? ''}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <div className="flex gap-3">
          <Link
            href={`/groups/${groupId}/invite`}
            className="flex-1 rounded-lg border border-primary px-4 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            Invite Player
          </Link>
          <Link
            href={`/games/new?group=${groupId}`}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Create Game
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <span className="text-sm font-medium text-text-secondary">Members</span>
          <span className="text-sm text-text">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
          <Link
            href={`/groups/${groupId}/members`}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            View Members
          </Link>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <span className="text-sm font-medium text-text-secondary">Upcoming Games</span>
          <span className="text-sm text-text">
            {games.length === 0
              ? 'No upcoming games'
              : games.length === 1
                ? `${formatDate(games[0].kickoff_date)} at ${formatTime(games[0].kickoff_date)}`
                : `${games.length} games scheduled`}
          </span>
          {games.length > 0 && (
            <Link
              href={games.length === 1 ? `/games/${games[0].id}` : `/groups/${groupId}/games`}
              className="text-sm font-medium text-primary hover:text-primary-hover"
            >
              {games.length === 1 ? 'View Game' : 'View Games'}
            </Link>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <LeaveGroupButton groupId={groupId} groupName={(group as Group).name} />
      </div>
    </div>
  );
}
