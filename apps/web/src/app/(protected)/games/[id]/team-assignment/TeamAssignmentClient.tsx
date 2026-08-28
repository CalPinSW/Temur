'use client';

import { useState, useTransition } from 'react';
import { getPlayerDisplayName, getTeamCounts, type PlayerGameWithProfile } from '@temur/shared';
import {
  seedFromPlayers,
  assignTeam,
  moveOnBoard,
  autoAssign,
  clearAll,
  buildSavePayload,
  buildNotifyRecipients,
  type AssignmentState,
} from './teamAssignmentState';
import { TeamAssignmentBoard } from './TeamAssignmentBoard';
import { PlayerAssignmentRow } from './PlayerAssignmentRow';
import { saveTeamAssignments, notifyTeamAssignments } from './actions';

export function TeamAssignmentClient({
  gameId,
  players,
  team1Name,
  team2Name,
  defaultNotifyMessage,
}: {
  gameId: string;
  players: PlayerGameWithProfile[];
  team1Name: string;
  team2Name: string;
  defaultNotifyMessage: string;
}) {
  const playerIds = players.map((p) => p.id);
  const [state, setState] = useState<AssignmentState>(() => seedFromPlayers(players));
  const [boardView, setBoardView] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState(defaultNotifyMessage);
  const [notifyError, setNotifyError] = useState('');
  const [notifySent, setNotifySent] = useState(false);
  const [isNotifying, startNotifying] = useTransition();

  const teamCounts = getTeamCounts(state.assignments);

  const handleAssignTeam = (playerGameId: string, team: number | null) => {
    setState((prev) => assignTeam(prev, playerGameId, team));
    setIsDirty(true);
  };

  const handleMoveOnBoard: React.ComponentProps<typeof TeamAssignmentBoard>['onMovePlayer'] = (
    playerGameId,
    team,
    position
  ) => {
    setState((prev) => moveOnBoard(prev, playerGameId, team, position));
    setIsDirty(true);
  };

  const handleAutoAssign = () => {
    setState(autoAssign(playerIds));
    setIsDirty(true);
  };

  const handleClearAll = () => {
    if (!window.confirm('Are you sure you want to clear all team assignments?')) return;
    setState(clearAll(playerIds));
    setIsDirty(true);
  };

  const handleSave = () => {
    setError('');
    const rows = buildSavePayload(playerIds, state);

    startTransition(async () => {
      const { error } = await saveTeamAssignments(gameId, rows);
      if (error) {
        setError(error);
        return;
      }
      setIsDirty(false);
      setNotifySent(false);
    });
  };

  const handleNotify = () => {
    setNotifyError('');
    const recipients = buildNotifyRecipients(players, state);

    startNotifying(async () => {
      const { error } = await notifyTeamAssignments(
        gameId,
        recipients,
        team1Name,
        team2Name,
        notifyMessage
      );
      if (error) {
        setNotifyError(error);
        return;
      }
      setNotifySent(true);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
        <span className="flex items-center gap-2 text-sm text-text">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
          {team1Name}: {teamCounts.team1}
        </span>
        <span className="flex items-center gap-2 text-sm text-text">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          {team2Name}: {teamCounts.team2}
        </span>
        <span className="text-sm text-text-secondary">Unassigned: {teamCounts.unassigned}</span>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={handleAutoAssign}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
          >
            Auto-Assign (Alternate)
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-tertiary hover:bg-background-secondary"
          >
            Clear All
          </button>
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-text">
        <input
          type="checkbox"
          checked={boardView}
          onChange={(e) => setBoardView(e.target.checked)}
        />
        Board view
      </label>

      {boardView ? (
        <TeamAssignmentBoard
          players={players}
          assignments={state.assignments}
          positions={state.positions}
          team1Name={team1Name}
          team2Name={team2Name}
          onMovePlayer={handleMoveOnBoard}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          {players.map((pg, index) => (
            <PlayerAssignmentRow
              key={pg.id}
              playerName={getPlayerDisplayName(pg) + (pg.is_ringer ? ' (Ringer)' : '')}
              position={index + 1}
              currentTeam={state.assignments[pg.id]}
              onAssignTeam={(team) => handleAssignTeam(pg.id, team)}
            />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Saving…' : isDirty ? 'Save Team Assignments' : 'Save Team Assignments (no changes)'}
      </button>

      {teamCounts.team1 + teamCounts.team2 > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border border-border-light px-3 py-2">
          <h2 className="text-sm font-semibold text-text-secondary">Notify Players</h2>
          {isDirty ? (
            <p className="text-xs text-text-tertiary">
              Save your team assignments before notifying players.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setNotifyOpen((v) => !v)}
                className="self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
              >
                {notifyOpen ? 'Hide' : 'Notify Players of Teams'}
              </button>

              {notifyOpen && (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    rows={3}
                    placeholder="Add a message for players..."
                    className="rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-text outline-none focus:border-primary"
                  />
                  <p className="text-xs text-text-tertiary">
                    {`Each player's team is added automatically, e.g. "You're on ${team1Name}".`}
                  </p>
                  {notifyError && <p className="text-sm text-error">{notifyError}</p>}
                  {notifySent && !notifyError && (
                    <p className="text-sm text-success">Players notified!</p>
                  )}
                  <button
                    type="button"
                    onClick={handleNotify}
                    disabled={isNotifying}
                    className="self-start rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    {isNotifying ? 'Sending…' : 'Send Notifications'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
