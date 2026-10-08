'use client';

import { useState, useTransition } from 'react';
import {
  getSeriesVisibility,
  getSeriesVisibleAt,
  getWallClockTime,
  setWallClockTime,
} from '@temur/shared';
import { updateGameSeriesFuture } from '../../actions';
import { VisibleFromField, parseTimeInput, toTimeInput } from '../../VisibleFromField';

const PLAYERS_PER_TEAM_OPTIONS = [5, 6, 7, 8, 9, 10, 11];

const inputClass =
  'rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary';

export function EditSeriesForm({
  groupId,
  seriesId,
  games,
  initial,
}: {
  groupId: string;
  seriesId: string;
  games: { id: string; kickoffDate: string; visibleAt: string }[];
  initial: {
    team1Name: string;
    team2Name: string;
    playersPerTeam: number;
    gameDescription: string;
  };
}) {
  const [kickoffTime, setKickoffTime] = useState(() => {
    const { hours, minutes } = getWallClockTime(new Date(games[0].kickoffDate));
    return toTimeInput(hours, minutes);
  });
  const [visibility, setVisibility] = useState(() =>
    getSeriesVisibility(new Date(games[0].kickoffDate), new Date(games[0].visibleAt))
  );
  const [team1Name, setTeam1Name] = useState(initial.team1Name);
  const [team2Name, setTeam2Name] = useState(initial.team2Name);
  const [playersPerTeam, setPlayersPerTeam] = useState(initial.playersPerTeam);
  const [gameDescription, setGameDescription] = useState(initial.gameDescription);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError('');
    const time = parseTimeInput(kickoffTime);
    if (!time) {
      setError('Enter a valid kickoff time.');
      return;
    }

    const kickoffs = games.map((g) => setWallClockTime(new Date(g.kickoffDate), time));
    const visibleAts = kickoffs.map((k) => getSeriesVisibleAt(k, visibility));

    startTransition(async () => {
      const result = await updateGameSeriesFuture({
        seriesId,
        groupId,
        gameIds: games.map((g) => g.id),
        kickoffs: kickoffs.map((d) => d.toISOString()),
        visibleAts: visibleAts.map((d) => d.toISOString()),
        team1Name,
        team2Name,
        playersPerTeam,
        gameDescription,
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="gameDescription" className="text-sm font-medium text-text-secondary">
          Description
        </label>
        <textarea
          id="gameDescription"
          value={gameDescription}
          onChange={(e) => setGameDescription(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="kickoffTime" className="text-sm font-medium text-text-secondary">
          Kickoff Time
        </label>
        <p className="text-xs text-text-tertiary">Applied to each upcoming game on its own date.</p>
        <input
          id="kickoffTime"
          type="time"
          value={kickoffTime}
          onChange={(e) => setKickoffTime(e.target.value)}
          className={`${inputClass} w-40`}
        />
      </div>

      <VisibleFromField
        visibility={visibility}
        onDaysBeforeChange={(daysBefore) => setVisibility((v) => ({ ...v, daysBefore }))}
        onTimeChange={(time) => setVisibility((v) => ({ ...v, ...time }))}
      />

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

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Save Changes to Block'}
      </button>
    </div>
  );
}
