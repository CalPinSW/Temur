import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  formatDate,
  formatTime,
  getGameCapacity,
  type Game,
  type GameWithPlayers,
  type PlayerGameWithProfile,
} from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

interface RawGame extends Game {
  player_games: Pick<PlayerGameWithProfile, 'id' | 'user_id' | 'signup_order' | 'team' | 'profile'>[] | null;
}

function GameCard({ game }: { game: GameWithPlayers }) {
  const capacity = getGameCapacity(game.players_per_team);

  return (
    <Link
      href={`/games/${game.id}`}
      className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary"
    >
      <span className="font-medium text-text">
        {game.team1_name} vs {game.team2_name}
      </span>
      <span className="text-sm text-text-secondary">
        {formatDate(game.kickoff_date)} · {formatTime(game.kickoff_date)}
      </span>
      <span className="text-sm text-text-tertiary">
        {game.player_count}/{capacity} signed up
        {game.user_signed_up ? ' · You’re in' : ''}
      </span>
    </Link>
  );
}

export default async function GroupGamesPage({ params }: PageProps<'/groups/[id]/games'>) {
  const { id: groupId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data: group, error: groupError }, { data: games, error: gamesError }] =
    await Promise.all([
      supabase.from('groups').select('id, name').eq('id', groupId).single(),
      supabase
        .from('games')
        .select(
          `*, player_games (
            id, user_id, signup_order, team,
            profile:profiles!player_games_user_id_fkey ( id, username, display_name, avatar_url )
          )`
        )
        .eq('group_id', groupId)
        .gte('kickoff_date', new Date().toISOString())
        .order('kickoff_date', { ascending: true }),
    ]);

  if (groupError || !group) notFound();
  if (gamesError) throw gamesError;

  const upcomingGames: GameWithPlayers[] = ((games as RawGame[]) ?? []).map((game) => ({
    ...game,
    player_games: (game.player_games ?? []) as PlayerGameWithProfile[],
    player_count: game.player_games?.length ?? 0,
    user_signed_up: game.player_games?.some((pg) => pg.user_id === user.id) ?? false,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Upcoming Games — {group.name}</h1>
      {upcomingGames.length === 0 ? (
        <p className="text-sm text-text-secondary">
          This group doesn&apos;t have any games scheduled yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {upcomingGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
