'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addMonths,
  formatMonthTitle,
  getMonthGrid,
  groupByDay,
  isSameDay,
  isSameMonth,
  toDateKey,
  WEEKDAY_LABELS,
} from '@temur/shared';

export interface CalendarGame {
  id: string;
  team1Name: string;
  team2Name: string;
  kickoffDate: string;
  isPreview: boolean;
  hasResult: boolean;
}

const MAX_CHIPS_PER_DAY = 3;

export function GroupCalendar({ groupId, games }: { groupId: string; games: CalendarGame[] }) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const grid = useMemo(
    () => getMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );
  const gamesByDay = useMemo(() => groupByDay(games, (g) => new Date(g.kickoffDate)), [games]);

  const showingCurrentMonth = isSameMonth(viewMonth, today);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">{formatMonthTitle(viewMonth)}</span>
          {!showingCurrentMonth && (
            <button
              type="button"
              onClick={() => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background-secondary"
            >
              Today
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
        >
          ›
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-2 py-1.5 text-center text-xs font-medium text-text-tertiary"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {grid.flat().map((day) => {
              const key = toDateKey(day);
              const dayGames = gamesByDay[key] ?? [];
              const inMonth = isSameMonth(day, viewMonth);
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={key}
                  className={`min-h-[92px] border-b border-r border-border p-1 ${
                    inMonth ? '' : 'bg-background-secondary/40'
                  }`}
                >
                  <div
                    className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? 'bg-primary font-semibold text-white'
                        : inMonth
                          ? 'text-text-secondary'
                          : 'text-text-tertiary'
                    }`}
                  >
                    {day.getDate()}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {dayGames.slice(0, MAX_CHIPS_PER_DAY).map((game) => {
                      const isPast = new Date(game.kickoffDate) < today;
                      return (
                        <Link
                          key={game.id}
                          href={`/games/${game.id}`}
                          title={`${game.team1Name} vs ${game.team2Name}`}
                          className={`truncate rounded px-1 py-0.5 text-[11px] font-medium transition-colors ${
                            game.isPreview
                              ? 'bg-background-secondary text-text-tertiary hover:bg-border-light'
                              : isPast
                                ? 'bg-background-secondary text-text-secondary hover:bg-border-light'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {game.hasResult ? '✓ ' : ''}
                          {game.team1Name} v {game.team2Name}
                        </Link>
                      );
                    })}
                    {dayGames.length > MAX_CHIPS_PER_DAY && (
                      <span className="px-1 text-[10px] text-text-tertiary">
                        +{dayGames.length - MAX_CHIPS_PER_DAY} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {games.length === 0 && (
        <p className="text-sm text-text-secondary">
          This group doesn&apos;t have any games scheduled yet.{' '}
          <Link href={`/groups/${groupId}/games`} className="font-medium text-primary">
            Back to list
          </Link>
        </p>
      )}
    </div>
  );
}
