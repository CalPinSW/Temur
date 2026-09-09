import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DEFAULT_VISIBLE_AT_LEAD_DAYS } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { EditSeriesForm } from './EditSeriesForm';

export default async function EditSeriesPage({
  params,
}: PageProps<'/groups/[id]/series/[seriesId]/edit'>) {
  const { id: groupId, seriesId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data: members, error: membersError }, { data: series, error: seriesError }] =
    await Promise.all([
      supabase.from('group_members').select('user_id, role').eq('group_id', groupId),
      supabase.from('game_series').select('id, group_id, deleted_at').eq('id', seriesId).single(),
    ]);

  if (seriesError || !series || series.group_id !== groupId) notFound();
  if (membersError) throw membersError;

  const isAdmin = (members ?? []).some((m) => m.user_id === user.id && m.role === 'admin');
  if (!isAdmin) redirect(`/groups/${groupId}`);

  const { data: upcoming } = await supabase
    .from('games')
    .select('kickoff_date, visible_at, team1_name, team2_name, players_per_team, game_description')
    .eq('series_id', seriesId)
    .is('deleted_at', null)
    .gte('kickoff_date', new Date().toISOString())
    .order('kickoff_date', { ascending: true });

  const games = upcoming ?? [];

  if (series.deleted_at || games.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
        <h1 className="text-lg font-semibold text-text">Recurring block</h1>
        <p className="text-sm text-text-secondary">
          This block has no upcoming games left to edit.
        </p>
        <Link
          href={`/groups/${groupId}/games`}
          className="self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
        >
          Back to games
        </Link>
      </div>
    );
  }

  const next = games[0];
  const nextKickoff = new Date(next.kickoff_date);
  const leadMs = nextKickoff.getTime() - new Date(next.visible_at).getTime();
  const leadDays =
    Math.max(0, Math.round(leadMs / (24 * 60 * 60 * 1000))) || DEFAULT_VISIBLE_AT_LEAD_DAYS;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text">Edit recurring block</h1>
        <p className="text-sm text-text-secondary">
          Changes apply to all {games.length} upcoming game
          {games.length === 1 ? '' : 's'} in this block. Games already played are left as they are.
        </p>
      </div>
      <EditSeriesForm
        groupId={groupId}
        seriesId={seriesId}
        initial={{
          kickoffTime: `${String(nextKickoff.getHours()).padStart(2, '0')}:${String(
            nextKickoff.getMinutes()
          ).padStart(2, '0')}`,
          visibleLeadDays: leadDays,
          team1Name: next.team1_name,
          team2Name: next.team2_name,
          playersPerTeam: next.players_per_team,
          gameDescription: next.game_description ?? '',
        }}
      />
    </div>
  );
}
