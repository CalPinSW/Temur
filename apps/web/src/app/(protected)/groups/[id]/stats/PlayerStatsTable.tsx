'use client';

import { Fragment, useState } from 'react';
import {
  formatGoalDifference,
  formatRating,
  formatRecord,
  formatStreak,
  formatWinRate,
  sortPlayerStats,
  type PartnerSummary,
  type PlayerResult,
  type PlayerStats,
  type PlayerStatsSortKey,
  type SortDirection,
} from '@temur/shared';

const SORTABLE_COLUMNS: { key: PlayerStatsSortKey; label: string; title: string }[] = [
  { key: 'appearances', label: 'Games', title: 'Sort by games played' },
  { key: 'pointsPerGame', label: 'W-D-L', title: 'Sort by points per game' },
  { key: 'winRate', label: 'Win %', title: 'Sort by win rate' },
  { key: 'goalDifference', label: 'Avg GD', title: 'Sort by average goal difference' },
  { key: 'averageRating', label: 'Rating', title: 'Sort by average rating' },
  { key: 'playerOfTheMatch', label: 'POTM', title: 'Sort by player-of-the-match count' },
];

const RESULT_BADGE: Record<PlayerResult, { label: string; className: string }> = {
  win: { label: 'W', className: 'bg-success text-white' },
  draw: { label: 'D', className: 'bg-text-tertiary text-white' },
  loss: { label: 'L', className: 'bg-error text-white' },
};

function FormBadges({ form }: { form: PlayerResult[] }) {
  if (form.length === 0) return <span className="text-text-tertiary">–</span>;
  return (
    <span className="flex gap-0.5">
      {form.map((result, index) => (
        <span
          key={index}
          className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${RESULT_BADGE[result].className}`}
        >
          {RESULT_BADGE[result].label}
        </span>
      ))}
    </span>
  );
}

function PartnerLine({ label, summary }: { label: string; summary: PartnerSummary | null }) {
  if (!summary) return null;
  return (
    <li>
      <span className="text-text-secondary">{label}: </span>
      <span className="font-medium text-text">{summary.partner.name}</span>{' '}
      <span className="text-text-secondary">
        ({formatRecord(summary.record)}
        {summary.record.averageGoalDifference !== null &&
          `, ${formatGoalDifference(summary.record.averageGoalDifference, 1)} GD/game`}
        )
      </span>
    </li>
  );
}

function PlayerDetails({ stats }: { stats: PlayerStats }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      <li>
        <span className="text-text-secondary">Record: </span>
        <span className="text-text">
          {formatRecord(stats.record)} · total GD{' '}
          {formatGoalDifference(stats.record.goalDifference)}
        </span>
      </li>
      <li>
        <span className="text-text-secondary">Streaks: </span>
        <span className="text-text">
          {stats.currentStreak ? `currently ${formatStreak(stats.currentStreak)}` : 'none yet'} ·
          best {stats.longestWinStreak} wins in a row · {stats.longestUnbeatenStreak} unbeaten
        </span>
      </li>
      <li>
        <span className="text-text-secondary">Rated in: </span>
        <span className="text-text">{stats.ratedGames} games</span>
      </li>
      <PartnerLine label="Best partner" summary={stats.bestPartner} />
      <PartnerLine label="Worst partner" summary={stats.worstPartner} />
      <PartnerLine label="Nemesis" summary={stats.nemesis} />
    </ul>
  );
}

export function PlayerStatsTable({ players }: { players: PlayerStats[] }) {
  const [sortKey, setSortKey] = useState<PlayerStatsSortKey>('appearances');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = sortPlayerStats(players, sortKey, direction);

  const onSort = (key: PlayerStatsSortKey) => {
    if (key === sortKey) {
      setDirection(direction === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setDirection('desc');
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-background-secondary text-left text-xs text-text-secondary">
          <tr>
            <th className="px-3 py-2 font-medium">Player</th>
            {SORTABLE_COLUMNS.map((column) => {
              const active = column.key === sortKey;
              return (
                <th
                  key={column.key}
                  aria-sort={active ? (direction === 'desc' ? 'descending' : 'ascending') : 'none'}
                  className="px-2 py-2 text-right font-medium"
                >
                  <button
                    type="button"
                    title={column.title}
                    onClick={() => onSort(column.key)}
                    className={`inline-flex items-center gap-0.5 whitespace-nowrap transition-colors hover:text-text ${active ? 'text-text' : ''}`}
                  >
                    {column.label}
                    <span aria-hidden className={active ? '' : 'invisible'}>
                      {direction === 'desc' ? '▼' : '▲'}
                    </span>
                  </button>
                </th>
              );
            })}
            <th className="px-3 py-2 font-medium">Form</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((stats) => {
            const isExpanded = expanded === stats.player.userId;
            return (
              <Fragment key={stats.player.userId}>
                <tr className="border-t border-border-light">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpanded(isExpanded ? null : stats.player.userId)}
                      className="whitespace-nowrap font-medium text-text hover:text-primary"
                    >
                      {isExpanded ? '▾' : '▸'} {stats.player.name}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right text-text">{stats.appearances}</td>
                  <td className="px-2 py-2 text-right text-text-secondary">
                    {stats.record.wins}-{stats.record.draws}-{stats.record.losses}
                  </td>
                  <td className="px-2 py-2 text-right text-text">
                    {formatWinRate(stats.record.winRate)}
                  </td>
                  <td className="px-2 py-2 text-right text-text">
                    {formatGoalDifference(stats.record.averageGoalDifference, 1)}
                  </td>
                  <td className="px-2 py-2 text-right text-text">
                    {formatRating(stats.averageRating)}
                  </td>
                  <td className="px-2 py-2 text-right text-text">{stats.playerOfTheMatch}</td>
                  <td className="px-3 py-2">
                    <FormBadges form={stats.form} />
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-background-secondary/50">
                    <td colSpan={8} className="px-3 py-3">
                      <PlayerDetails stats={stats} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
