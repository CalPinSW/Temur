'use client';

import { useState, useTransition } from 'react';
import { formatGameResult, type GameOutcome } from '@temur/shared';
import { setGameResultScore, setGameResultOutcome } from './actions';

export function GameResultForm({
  gameId,
  team1Name,
  team2Name,
  resultTeam1Score,
  resultTeam2Score,
  resultOutcome,
}: {
  gameId: string;
  team1Name: string;
  team2Name: string;
  resultTeam1Score: number | null;
  resultTeam2Score: number | null;
  resultOutcome: GameOutcome | null;
}) {
  const hasResult = resultTeam1Score !== null || resultOutcome !== null;
  const [isEditing, setIsEditing] = useState(!hasResult);
  const [entryMode, setEntryMode] = useState<'score' | 'outcome'>(
    resultOutcome !== null ? 'outcome' : 'score'
  );
  const [team1ScoreInput, setTeam1ScoreInput] = useState(resultTeam1Score?.toString() ?? '');
  const [team2ScoreInput, setTeam2ScoreInput] = useState(resultTeam2Score?.toString() ?? '');
  const [outcomeInput, setOutcomeInput] = useState<GameOutcome | null>(resultOutcome);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError('');

    if (entryMode === 'score') {
      const team1Score = Number(team1ScoreInput);
      const team2Score = Number(team2ScoreInput);

      if (
        !Number.isInteger(team1Score) ||
        !Number.isInteger(team2Score) ||
        team1Score < 0 ||
        team2Score < 0
      ) {
        setError('Enter a whole number for each team.');
        return;
      }

      startTransition(async () => {
        const { error } = await setGameResultScore(gameId, team1Score, team2Score);
        if (error) {
          setError(error);
          return;
        }
        setIsEditing(false);
      });
      return;
    }

    if (!outcomeInput) {
      setError('Choose a winner or a draw.');
      return;
    }

    startTransition(async () => {
      const { error } = await setGameResultOutcome(gameId, outcomeInput);
      if (error) {
        setError(error);
        return;
      }
      setIsEditing(false);
    });
  };

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <p className="font-medium text-text">
          {formatGameResult(team1Name, team2Name, resultTeam1Score, resultTeam2Score, resultOutcome)}
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
        >
          Edit Result
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEntryMode('score')}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            entryMode === 'score'
              ? 'bg-primary text-white'
              : 'border border-border text-text-secondary hover:bg-background-secondary'
          }`}
        >
          Score
        </button>
        <button
          type="button"
          onClick={() => setEntryMode('outcome')}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            entryMode === 'outcome'
              ? 'bg-primary text-white'
              : 'border border-border text-text-secondary hover:bg-background-secondary'
          }`}
        >
          Win / Draw / Loss
        </button>
      </div>

      {entryMode === 'score' ? (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="team1Score" className="text-sm font-medium text-text-secondary">
              {team1Name}
            </label>
            <input
              id="team1Score"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              value={team1ScoreInput}
              onChange={(e) => setTeam1ScoreInput(e.target.value)}
              className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="team2Score" className="text-sm font-medium text-text-secondary">
              {team2Name}
            </label>
            <input
              id="team2Score"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              value={team2ScoreInput}
              onChange={(e) => setTeam2ScoreInput(e.target.value)}
              className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(
            [
              [`${team1Name} won`, 'team1_win'],
              ['Draw', 'draw'],
              [`${team2Name} won`, 'team2_win'],
            ] as const
          ).map(([label, value]) => (
            <button
              key={value}
              type="button"
              onClick={() => setOutcomeInput(value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                outcomeInput === value
                  ? 'bg-primary text-white'
                  : 'border border-border text-text-secondary hover:bg-background-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex gap-3">
        {hasResult && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save Result'}
        </button>
      </div>
    </div>
  );
}
