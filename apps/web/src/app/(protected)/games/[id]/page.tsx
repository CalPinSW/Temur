import { notFound } from 'next/navigation';
import {
  type Game,
  type PlayerGameWithProfile,
  formatDate,
  formatTime,
  getGameCapacity,
  getActivePlayers,
  getWaitlistPlayers,
  getPlayerDisplayName,
} from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { SignupActions } from './SignupActions';

interface RawGame extends Game {
  player_games: PlayerGameWithProfile[] | null;
}

function PlayerRow({ player, position }: { player: PlayerGameWithProfile; position: number }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border-light px-3 py-2 text-sm">
      <span className="w-5 text-text-tertiary">{position}</span>
      <span className="text-text">{getPlayerDisplayName(player)}</span>
      {player.team != null && (
        <span className="ml-auto text-xs text-text-tertiary">Team {player.team}</span>
      )}
    </li>
  );
}

export default async function GameDetailPage({ params }: PageProps<'/games/[id]'>) {
  const { id } = await params;
  const user = await getUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select(
      `*, player_games (
        id, user_id, signup_order, team, created_at, is_ringer, guest_name, added_by,
        profile:profiles!player_games_user_id_fkey ( id, username, display_name, avatar_url )
      )`
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const game = data as RawGame;
  const players = (game.player_games ?? []).slice().sort((a, b) => a.signup_order - b.signup_order);
  const capacity = getGameCapacity(game.players_per_team);
  const activePlayers = getActivePlayers(players, capacity);
  const waitlistPlayers = getWaitlistPlayers(players, capacity);
  const isSignedUp = players.some((p) => p.user_id === user!.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text">
          {game.team1_name} vs {game.team2_name}
        </h1>
        <p className="text-sm text-text-secondary">
          {formatDate(game.kickoff_date)} · {formatTime(game.kickoff_date)}
        </p>
      </div>

      <SignupActions gameId={game.id} isSignedUp={isSignedUp} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-secondary">
          Signed up ({activePlayers.length}/{capacity})
        </h2>
        <ul className="flex flex-col gap-1">
          {activePlayers.map((player, i) => (
            <PlayerRow key={player.id} player={player} position={i + 1} />
          ))}
        </ul>
      </section>

      {waitlistPlayers.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text-secondary">
            Waitlist ({waitlistPlayers.length})
          </h2>
          <ul className="flex flex-col gap-1">
            {waitlistPlayers.map((player, i) => (
              <PlayerRow key={player.id} player={player} position={capacity + i + 1} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
