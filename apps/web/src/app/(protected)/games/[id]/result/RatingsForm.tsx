'use client';

import { useState, useTransition } from 'react';
import { getPlayerDisplayName, getInitials, type PlayerGameWithProfile } from '@temur/shared';
import { submitRatings } from './actions';

const RATING_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

function PlayerAvatar({ player }: { player: PlayerGameWithProfile }) {
  return player.profile?.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
    <img src={player.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
      {getInitials(player.profile?.display_name, player.profile?.username)}
    </div>
  );
}

function RatingRow({
  player,
  rating,
  onChange,
}: {
  player: PlayerGameWithProfile;
  rating: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <PlayerAvatar player={player} />
      <span className="flex-1 text-sm text-text">{getPlayerDisplayName(player)}</span>
      <select
        value={rating ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-24 rounded-lg border border-input-border bg-input px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
      >
        <option value="">Rate</option>
        {RATING_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RatingsForm({
  gameId,
  team1Name,
  team2Name,
  ratablePlayers,
  initialRatings,
}: {
  gameId: string;
  team1Name: string;
  team2Name: string;
  ratablePlayers: PlayerGameWithProfile[];
  initialRatings: Record<string, number>;
}) {
  const [ratings, setRatings] = useState<Record<string, number | undefined>>(initialRatings);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasTeams = ratablePlayers.some((pg) => pg.team !== null);

  const setRating = (playerGameId: string, value: number | undefined) => {
    setSaved(false);
    setRatings((prev) => ({ ...prev, [playerGameId]: value }));
  };

  const handleSave = () => {
    setError('');
    const toSave = Object.entries(ratings)
      .filter((entry): entry is [string, number] => entry[1] !== undefined)
      .map(([playerGameId, rating]) => ({ playerGameId, rating }));

    startTransition(async () => {
      const { error } = await submitRatings(gameId, toSave);
      if (error) {
        setError(error);
        return;
      }
      setSaved(true);
    });
  };

  const renderGroup = (title: string, players: PlayerGameWithProfile[]) =>
    players.length > 0 && (
      <div key={title} className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {players.map((pg) => (
          <RatingRow
            key={pg.id}
            player={pg}
            rating={ratings[pg.id]}
            onChange={(value) => setRating(pg.id, value)}
          />
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Optional — rate each player from 1 to 10. Only you can see your own ratings.
      </p>

      {hasTeams ? (
        <div className="flex flex-col gap-4">
          {renderGroup(
            team1Name,
            ratablePlayers.filter((pg) => pg.team === 1)
          )}
          {renderGroup(
            team2Name,
            ratablePlayers.filter((pg) => pg.team === 2)
          )}
          {renderGroup(
            'Unassigned',
            ratablePlayers.filter((pg) => pg.team === null)
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {ratablePlayers.map((pg) => (
            <RatingRow
              key={pg.id}
              player={pg}
              rating={ratings[pg.id]}
              onChange={(value) => setRating(pg.id, value)}
            />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
      {saved && !error && <p className="text-sm text-success">Ratings saved!</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Save Ratings'}
      </button>
    </div>
  );
}
