'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  MAX_SERIES_GAMES,
  SERIES_INTERVAL_WEEKS_OPTIONS,
  DEFAULT_VISIBLE_AT_LEAD_DAYS,
  formatDate,
  formatTime,
  generateSeriesKickoffs,
  getDefaultSeriesEndDate,
  getNextSaturday,
} from '@temur/shared';
import { createGameSeries } from '../actions';

const PLAYERS_PER_TEAM_OPTIONS = [5, 6, 7, 8, 9, 10, 11];

const pad = (n: number) => String(n).padStart(2, '0');
const toDatetimeLocal = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const toDateInput = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const inputClass =
  'rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary';

export function CreateSeriesForm({ groupId }: { groupId: string }) {
  const defaultFirst = useMemo(() => getNextSaturday(new Date()), []);

  const [firstKickoff, setFirstKickoff] = useState(toDatetimeLocal(defaultFirst));
  const [endDate, setEndDate] = useState(toDateInput(getDefaultSeriesEndDate(defaultFirst)));
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [intervalWeeks, setIntervalWeeks] = useState(1);
  const [visibleLeadDays, setVisibleLeadDays] = useState(DEFAULT_VISIBLE_AT_LEAD_DAYS);
  const [team1Name, setTeam1Name] = useState('Black');
  const [team2Name, setTeam2Name] = useState('White');
  const [playersPerTeam, setPlayersPerTeam] = useState(6);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleFirstKickoffChange = (value: string) => {
    setFirstKickoff(value);
    if (!endDateTouched && value) {
      setEndDate(toDateInput(getDefaultSeriesEndDate(new Date(value))));
    }
  };

  const kickoffs = useMemo(() => {
    const first = new Date(firstKickoff);
    const end = new Date(endDate);
    if (Number.isNaN(first.getTime()) || Number.isNaN(end.getTime())) return [];
    return generateSeriesKickoffs(first, end, intervalWeeks);
  }, [firstKickoff, endDate, intervalWeeks]);

  const tooMany = kickoffs.length > MAX_SERIES_GAMES;
  const tooFew = kickoffs.length < 2;

  const handleSubmit = () => {
    setError('');
    if (tooFew) {
      setError('That range only covers one game — pick a later end date.');
      return;
    }
    if (tooMany) {
      setError(`A recurring block can have at most ${MAX_SERIES_GAMES} games.`);
      return;
    }

    startTransition(async () => {
      const result = await createGameSeries({
        groupId,
        firstKickoff: new Date(firstKickoff).toISOString(),
        endDate: new Date(endDate).toISOString(),
        intervalWeeks,
        visibleLeadDays,
        team1Name,
        team2Name,
        playersPerTeam,
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="firstKickoff" className="text-sm font-medium text-text-secondary">
          First Kickoff
        </label>
        <input
          id="firstKickoff"
          type="datetime-local"
          value={firstKickoff}
          onChange={(e) => handleFirstKickoffChange(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="intervalWeeks" className="text-sm font-medium text-text-secondary">
          Repeat Every
        </label>
        <select
          id="intervalWeeks"
          value={intervalWeeks}
          onChange={(e) => setIntervalWeeks(Number(e.target.value))}
          className={inputClass}
        >
          {SERIES_INTERVAL_WEEKS_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? 'week' : `${n} weeks`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="endDate" className="text-sm font-medium text-text-secondary">
          Until
        </label>
        <input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDateTouched(true);
            setEndDate(e.target.value);
          }}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="visibleLeadDays" className="text-sm font-medium text-text-secondary">
          Visible From
        </label>
        <p className="text-xs text-text-tertiary">
          How many days before each kickoff players can see and sign up for that game.
        </p>
        <div className="flex items-center gap-2">
          <input
            id="visibleLeadDays"
            type="number"
            min={0}
            max={60}
            value={visibleLeadDays}
            onChange={(e) => setVisibleLeadDays(Math.max(0, Number(e.target.value)))}
            className={`${inputClass} w-24`}
          />
          <span className="text-sm text-text-secondary">days before</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="playersPerTeam" className="text-sm font-medium text-text-secondary">
          Players per Team
        </label>
        <select
          id="playersPerTeam"
          value={playersPerTeam}
          onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
          className={inputClass}
        >
          {PLAYERS_PER_TEAM_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} a-side
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="team1Name" className="text-sm font-medium text-text-secondary">
            Team 1 Name
          </label>
          <input
            id="team1Name"
            type="text"
            value={team1Name}
            onChange={(e) => setTeam1Name(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="team2Name" className="text-sm font-medium text-text-secondary">
            Team 2 Name
          </label>
          <input
            id="team2Name"
            type="text"
            value={team2Name}
            onChange={(e) => setTeam2Name(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-border-light bg-background-secondary p-3">
        {kickoffs.length === 0 ? (
          <p className="text-sm text-text-secondary">Pick a first kickoff and end date.</p>
        ) : (
          <>
            <p className="text-sm font-medium text-text-secondary">
              {tooFew
                ? 'Creates 1 game — extend the end date for a block'
                : `Creates ${kickoffs.length} game${kickoffs.length === 1 ? '' : 's'}${
                    tooMany ? ` (over the ${MAX_SERIES_GAMES} limit)` : ''
                  }`}
            </p>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm text-text-tertiary">
              {kickoffs.slice(0, 6).map((k) => (
                <li key={k.toISOString()}>
                  {formatDate(k.toISOString())} · {formatTime(k.toISOString())}
                </li>
              ))}
              {kickoffs.length > 6 && <li>…and {kickoffs.length - 6} more</li>}
            </ul>
          </>
        )}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || tooFew || tooMany}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Scheduling…' : 'Schedule Games'}
      </button>
    </div>
  );
}
