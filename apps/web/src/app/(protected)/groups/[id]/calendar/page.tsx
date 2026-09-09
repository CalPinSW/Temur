import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getGameVisibilityStatus } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { GroupCalendar, type CalendarGame } from './GroupCalendar';

interface RawGame {
  id: string;
  team1_name: string;
  team2_name: string;
  kickoff_date: string;
  visible_at: string;
  group_id: string | null;
  created_by: string | null;
  result_team1_score: number | null;
  result_outcome: string | null;
}

export default async function GroupCalendarPage({ params }: PageProps<'/groups/[id]/calendar'>) {
  const { id: groupId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [
    { data: group, error: groupError },
    { data: games, error: gamesError },
    { data: adminGroups },
  ] = await Promise.all([
    supabase.from('groups').select('id, name').eq('id', groupId).single(),
    supabase
      .from('games')
      .select(
        'id, team1_name, team2_name, kickoff_date, visible_at, group_id, created_by, result_team1_score, result_outcome'
      )
      .eq('group_id', groupId)
      .order('kickoff_date', { ascending: true }),
    supabase.from('group_members').select('group_id').eq('user_id', user.id).eq('role', 'admin'),
  ]);

  if (groupError || !group) notFound();
  if (gamesError) throw gamesError;

  const adminGroupIds = new Set((adminGroups ?? []).map((row) => row.group_id));

  // Same visibility rule as every other game list: not-yet-visible games are
  // hidden from non-admins and shown greyed to admins.
  const calendarGames: CalendarGame[] = ((games as RawGame[]) ?? [])
    .map((game) => ({ game, status: getGameVisibilityStatus(game, user.id, adminGroupIds) }))
    .filter(({ status }) => status.visible)
    .map(({ game, status }) => ({
      id: game.id,
      team1Name: game.team1_name,
      team2Name: game.team2_name,
      kickoffDate: game.kickoff_date,
      isPreview: status.isPreview,
      hasResult: game.result_team1_score !== null || game.result_outcome !== null,
    }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-text">{group.name}</h1>
        <div className="flex overflow-hidden rounded-lg border border-border text-sm">
          <Link
            href={`/groups/${groupId}/games`}
            className="px-3 py-1.5 font-medium text-text-secondary transition-colors hover:bg-background-secondary"
          >
            List
          </Link>
          <span className="border-l border-border bg-background-secondary px-3 py-1.5 font-medium text-text">
            Calendar
          </span>
        </div>
      </div>
      <GroupCalendar groupId={groupId} games={calendarGames} />
    </div>
  );
}
