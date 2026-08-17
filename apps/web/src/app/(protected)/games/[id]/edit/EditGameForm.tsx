'use client';

import { useState, useTransition } from 'react';
import { isVisibleAtBeforeKickoff } from '@temur/shared';
import { updateGame, type UpdateGameInput } from '../actions';

const PLAYERS_PER_TEAM_OPTIONS = [5, 6, 7, 8, 9, 10, 11];

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditGameForm({
  gameId,
  initial,
}: {
  gameId: string;
  initial: {
    gameDescription: string;
    kickoffDate: string;
    visibleAt: string;
    team1Name: string;
    team2Name: string;
    playersPerTeam: number;
  };
}) {
  const [gameDescription, setGameDescription] = useState(initial.gameDescription);
  const [kickoffDate, setKickoffDate] = useState(toDatetimeLocal(new Date(initial.kickoffDate)));
  const [visibleAt, setVisibleAt] = useState(toDatetimeLocal(new Date(initial.visibleAt)));
  const [team1Name, setTeam1Name] = useState(initial.team1Name);
  const [team2Name, setTeam2Name] = useState(initial.team2Name);
  const [playersPerTeam, setPlayersPerTeam] = useState(initial.playersPerTeam);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError('');

    if (!isVisibleAtBeforeKickoff(new Date(kickoffDate), new Date(visibleAt))) {
      setError('"Visible From" must be before the kickoff time.');
      return;
    }

    const input: UpdateGameInput = {
      gameDescription,
      kickoffDate: new Date(kickoffDate).toISOString(),
      visibleAt: new Date(visibleAt).toISOString(),
      team1Name,
      team2Name,
      playersPerTeam,
    };

    startTransition(async () => {
      const { error } = await updateGame(gameId, input);
      if (error) setError(error);
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
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="kickoffDate" className="text-sm font-medium text-text-secondary">
          Kickoff Date &amp; Time
        </label>
        <input
          id="kickoffDate"
          type="datetime-local"
          value={kickoffDate}
          onChange={(e) => setKickoffDate(e.target.value)}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="visibleAt" className="text-sm font-medium text-text-secondary">
          Visible From
        </label>
        <input
          id="visibleAt"
          type="datetime-local"
          value={visibleAt}
          onChange={(e) => setVisibleAt(e.target.value)}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="playersPerTeam" className="text-sm font-medium text-text-secondary">
          Players per Team
        </label>
        <select
          id="playersPerTeam"
          value={playersPerTeam}
          onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
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
            className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
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
            className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
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
        {isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
