import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  GROUP_STATS_RANGES,
  computeGroupStats,
  filterAppearancesByRange,
  formatDate,
  formatGoalDifference,
  formatPlayerNames,
  formatRecord,
  formatWinRate,
  parseGroupStatsRange,
  type GroupStatsAppearance,
  type PartnershipStats,
} from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { PlayerStatsTable } from './PlayerStatsTable';

export default async function GroupStatsPage({
  params,
  searchParams,
}: PageProps<'/groups/[id]/stats'>) {
  const { id: groupId } = await params;
  const { range: rangeParam } = await searchParams;
  const range = parseGroupStatsRange(typeof rangeParam === 'string' ? rangeParam : undefined);
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data: group, error: groupError }, { data: membership }] = await Promise.all([
    supabase.from('groups').select('id, name, single_team').eq('id', groupId).single(),
    supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (groupError || !group) notFound();
  if (membership?.role !== 'admin') redirect(`/groups/${groupId}`);

  const { data: rows, error } = await supabase.rpc('get_group_stats_appearances', {
    p_group_id: groupId,
  });
  if (error) throw error;

  const appearances = filterAppearancesByRange((rows ?? []) as GroupStatsAppearance[], range);
  const stats = computeGroupStats(appearances);
  const { summary } = stats;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-text">Stats</h1>
          <p className="text-sm text-text-secondary">{group.name}</p>
        </div>
        <nav className="flex overflow-hidden rounded-lg border border-border text-sm">
          {GROUP_STATS_RANGES.map((option, index) =>
            option.value === range ? (
              <span
                key={option.value}
                className={`bg-background-secondary px-3 py-1.5 font-medium text-text ${index > 0 ? 'border-l border-border' : ''}`}
              >
                {option.label}
              </span>
            ) : (
              <Link
                key={option.value}
                href={
                  option.value === 'all'
                    ? `/groups/${groupId}/stats`
                    : `/groups/${groupId}/stats?range=${option.value}`
                }
                className={`px-3 py-1.5 font-medium text-text-secondary transition-colors hover:bg-background-secondary ${index > 0 ? 'border-l border-border' : ''}`}
              >
                {option.label}
              </Link>
            )
          )}
        </nav>
      </div>

      {summary.gamesPlayed === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-text-secondary">
          No played games yet. Stats appear once a game has kicked off with players assigned to
          {group.single_team ? ' the squad' : ' teams'}.
        </p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryTile label="Games played" value={String(summary.gamesPlayed)} />
            <SummaryTile label="Players" value={String(summary.playerCount)} />
            <SummaryTile
              label="Goals per game"
              value={
                summary.averageGoalsPerGame === null ? '–' : summary.averageGoalsPerGame.toFixed(1)
              }
            />
            <SummaryTile label="Draws" value={formatWinRate(summary.drawRate)} />
            {summary.mostGamesPlayed && (
              <SummaryTile
                label="Most games played"
                value={formatPlayerNames(summary.mostGamesPlayed.players)}
                detail={`${summary.mostGamesPlayed.games} games`}
                className="col-span-2"
              />
            )}
          </section>

          {summary.biggestWin && (
            <p className="text-sm text-text-secondary">
              Biggest win:{' '}
              <Link
                href={`/games/${summary.biggestWin.gameId}`}
                className="font-medium text-primary hover:text-primary-hover"
              >
                {summary.biggestWin.winnerScore}–{summary.biggestWin.loserScore} on{' '}
                {formatDate(summary.biggestWin.kickoffDate)}
              </Link>
              {summary.gamesWithResult < summary.gamesPlayed && (
                <> · {summary.gamesPlayed - summary.gamesWithResult} games have no result entered</>
              )}
            </p>
          )}

          {stats.awards.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-text">Awards</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {stats.awards.map((award) => (
                  <li
                    key={award.key}
                    className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4"
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      {award.title}
                    </span>
                    <span className="font-semibold text-text">{award.winners.join(', ')}</span>
                    <span className="text-sm text-text-secondary">
                      {award.detail} · {award.description}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-text">Players</h2>
            <PlayerStatsTable players={stats.players} />
          </section>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <PartnershipList
              title="Dream teams"
              emptyText="No partnership has won at least half its games yet."
              partnerships={stats.bestPartnerships}
            />
            <PartnershipList
              title="Cursed combos"
              emptyText="No partnership has a losing record yet."
              partnerships={stats.worstPartnerships}
            />
          </section>

          {!group.single_team && stats.rivalries.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-text">Rivalries</h2>
              <ul className="flex flex-col gap-2">
                {stats.rivalries.map((rivalry) => (
                  <li
                    key={rivalry.players.map((p) => p.userId).join('|')}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border-light px-3 py-2 text-sm"
                  >
                    <span className="text-text">
                      {rivalry.players[0].name} vs {rivalry.players[1].name}
                    </span>
                    <span className="shrink-0 text-text-secondary">
                      {rivalry.wins[0]}–{rivalry.draws}–{rivalry.wins[1]} · {rivalry.games} games
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  detail,
  className = '',
}: {
  label: string;
  value: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-lg border border-border bg-card p-4 ${className}`}>
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <span className="text-xl font-semibold text-text">{value}</span>
      {detail && <span className="text-sm text-text-secondary">{detail}</span>}
    </div>
  );
}

function PartnershipList({
  title,
  emptyText,
  partnerships,
}: {
  title: string;
  emptyText: string;
  partnerships: PartnershipStats[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      {partnerships.length === 0 ? (
        <p className="text-sm text-text-secondary">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {partnerships.map(({ players, record }) => (
            <li
              key={players.map((p) => p.userId).join('|')}
              className="flex flex-col gap-0.5 rounded-lg border border-border-light px-3 py-2 text-sm"
            >
              <span className="font-medium text-text">
                {players[0].name} & {players[1].name}
              </span>
              <span className="text-text-secondary">
                {formatRecord(record)} · {formatWinRate(record.winRate)} wins
                {record.averageGoalDifference !== null &&
                  ` · ${formatGoalDifference(record.averageGoalDifference, 1)} GD/game`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
