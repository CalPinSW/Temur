'use client';

import { useState, useTransition } from 'react';
import {
  type Profile,
  getDefaultKickoffDate,
  getDefaultVisibleAt,
  isVisibleAtBeforeKickoff,
} from '@temur/shared';
import { createGame } from './actions';

const PLAYERS_PER_TEAM_OPTIONS = [5, 6, 7, 8, 9, 10, 11];

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateGameForm({
  adminGroups,
  friends,
  existingKickoffDates,
  presetGroupId,
}: {
  adminGroups: { id: string; name: string; single_team: boolean }[];
  friends: Profile[];
  existingKickoffDates: string[];
  presetGroupId?: string;
}) {
  const presetGroup = presetGroupId ? adminGroups.find((g) => g.id === presetGroupId) : undefined;
  const [mode, setMode] = useState<'friends' | 'group'>(presetGroupId ? 'group' : 'friends');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(presetGroupId ?? null);
  const effectiveGroupId =
    selectedGroupId ?? (!presetGroupId && mode === 'group' ? (adminGroups[0]?.id ?? null) : null);
  const effectiveGroup = adminGroups.find((g) => g.id === effectiveGroupId);
  const [friendsSingleTeam, setFriendsSingleTeam] = useState(false);
  const singleTeam = mode === 'group' ? (effectiveGroup?.single_team ?? false) : friendsSingleTeam;
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  const defaultKickoff = getDefaultKickoffDate(existingKickoffDates.map((d) => new Date(d)));
  const [kickoffDate, setKickoffDate] = useState(toDatetimeLocal(defaultKickoff));
  const [visibleAt, setVisibleAt] = useState(toDatetimeLocal(getDefaultVisibleAt(defaultKickoff)));
  const [visibleAtTouched, setVisibleAtTouched] = useState(false);

  const handleKickoffChange = (value: string) => {
    setKickoffDate(value);
    if (!visibleAtTouched && value) {
      setVisibleAt(toDatetimeLocal(getDefaultVisibleAt(new Date(value))));
    }
  };

  const handleVisibleAtChange = (value: string) => {
    setVisibleAtTouched(true);
    setVisibleAt(value);
  };
  const [team1Name, setTeam1Name] = useState('Black');
  const [team2Name, setTeam2Name] = useState('White');
  const [teamNamesTouched, setTeamNamesTouched] = useState(false);
  const [playersPerTeam, setPlayersPerTeam] = useState(6);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Sensible defaults per format, until the admin edits either name.
  const displayTeam1Name = teamNamesTouched
    ? team1Name
    : singleTeam
      ? (effectiveGroup?.name ?? 'Our team')
      : 'Black';
  const displayTeam2Name = teamNamesTouched ? team2Name : singleTeam ? '' : 'White';
  const setTeamName = (which: 1 | 2, value: string) => {
    setTeamNamesTouched(true);
    if (which === 1) setTeam1Name(value);
    else setTeam2Name(value);
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleSubmit = () => {
    setError('');

    if (mode === 'group' && !effectiveGroupId) {
      setError('Choose which group this game is for.');
      return;
    }

    if (!isVisibleAtBeforeKickoff(new Date(kickoffDate), new Date(visibleAt))) {
      setError('"Visible From" must be before the kickoff time.');
      return;
    }

    if (!displayTeam1Name.trim() || !displayTeam2Name.trim()) {
      setError(singleTeam ? 'Enter your team name and the opponent.' : 'Enter both team names.');
      return;
    }

    startTransition(async () => {
      const { error } = await createGame({
        mode,
        groupId: mode === 'group' ? effectiveGroupId : null,
        friendIds: Array.from(selectedFriendIds),
        kickoffDate: new Date(kickoffDate).toISOString(),
        visibleAt: new Date(visibleAt).toISOString(),
        team1Name: displayTeam1Name.trim(),
        team2Name: displayTeam2Name.trim(),
        playersPerTeam,
        singleTeam,
      });
      if (error) setError(error);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {!presetGroupId && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('friends')}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'friends'
                  ? 'bg-primary text-white'
                  : 'border border-border text-text-secondary hover:bg-background-secondary'
              }`}
            >
              Friends
            </button>
            <button
              type="button"
              onClick={() => setMode('group')}
              disabled={adminGroups.length === 0}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                mode === 'group'
                  ? 'bg-primary text-white'
                  : 'border border-border text-text-secondary hover:bg-background-secondary'
              }`}
            >
              Group
            </button>
          </div>
          {adminGroups.length === 0 && (
            <p className="text-xs text-text-tertiary">
              You need to be an admin of a group to create a group game.
            </p>
          )}
        </div>
      )}

      {mode === 'group' && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">
            Which group is this game for?
          </label>
          {presetGroup ? (
            <p className="font-medium text-text">{presetGroup.name}</p>
          ) : (
            <select
              value={effectiveGroupId ?? ''}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
            >
              {adminGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {mode === 'friends' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-text-secondary">Format</legend>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFriendsSingleTeam(false)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                !friendsSingleTeam
                  ? 'bg-primary text-white'
                  : 'border border-border text-text-secondary hover:bg-background-secondary'
              }`}
            >
              Two teams
            </button>
            <button
              type="button"
              onClick={() => setFriendsSingleTeam(true)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                friendsSingleTeam
                  ? 'bg-primary text-white'
                  : 'border border-border text-text-secondary hover:bg-background-secondary'
              }`}
            >
              One team vs opponent
            </button>
          </div>
        </fieldset>
      )}

      {mode === 'group' && singleTeam && (
        <p className="text-xs text-text-tertiary">
          This is a one-team group — you&apos;re fielding a single squad against an opponent.
        </p>
      )}

      {mode === 'friends' && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-text-secondary">Invite Friends</h2>
          {friends.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Add some friends first to invite them to a game.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {friends.map((friend) => (
                <label
                  key={friend.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text hover:bg-background-secondary"
                >
                  <input
                    type="checkbox"
                    checked={selectedFriendIds.has(friend.id)}
                    onChange={() => toggleFriend(friend.id)}
                  />
                  {friend.display_name || friend.username}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="kickoffDate" className="text-sm font-medium text-text-secondary">
            Kickoff Date &amp; Time
          </label>
          <input
            id="kickoffDate"
            type="datetime-local"
            value={kickoffDate}
            onChange={(e) => handleKickoffChange(e.target.value)}
            className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="visibleAt" className="text-sm font-medium text-text-secondary">
            Visible From
          </label>
          <p className="text-xs text-text-tertiary">
            When should players be able to see and sign up for this game?
          </p>
          <input
            id="visibleAt"
            type="datetime-local"
            value={visibleAt}
            onChange={(e) => handleVisibleAtChange(e.target.value)}
            className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="playersPerTeam" className="text-sm font-medium text-text-secondary">
            {singleTeam ? 'Squad Size' : 'Players per Team'}
          </label>
          <select
            id="playersPerTeam"
            value={playersPerTeam}
            onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
            className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
          >
            {PLAYERS_PER_TEAM_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {singleTeam ? `${n} players` : `${n} a-side`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="team1Name" className="text-sm font-medium text-text-secondary">
              {singleTeam ? 'Your Team Name' : 'Team 1 Name'}
            </label>
            <input
              id="team1Name"
              type="text"
              value={displayTeam1Name}
              onChange={(e) => setTeamName(1, e.target.value)}
              className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="team2Name" className="text-sm font-medium text-text-secondary">
              {singleTeam ? 'Opponent' : 'Team 2 Name'}
            </label>
            <input
              id="team2Name"
              type="text"
              value={displayTeam2Name}
              onChange={(e) => setTeamName(2, e.target.value)}
              placeholder={singleTeam ? 'e.g. Rovers FC' : undefined}
              className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
            />
          </div>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || (mode === 'group' && !effectiveGroupId)}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create Game'}
        </button>
      </div>
    </div>
  );
}
