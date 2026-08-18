import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  type Game,
  type GameWithPlayers,
  type PlayerGameWithProfile,
  formatDate,
  formatTime,
  getGameCapacity,
  getGameVisibilityStatus,
} from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

interface RawGame extends Game {
  player_games: Pick<PlayerGameWithProfile, 'id' | 'user_id' | 'signup_order' | 'team' | 'profile'>[] | null;
  group: { name: string } | null;
}

interface GameListItem extends GameWithPlayers {
  isPreview: boolean;
}

async function loadGames(userId: string) {
  const supabase = await createClient();

  const [{ data: games, error }, { data: adminGroups }] = await Promise.all([
    supabase
      .from('games')
      .select(
        `*, group:groups(name), player_games (
          id, user_id, signup_order, team,
          profile:profiles!player_games_user_id_fkey ( id, username, display_name, avatar_url )
        )`
      )
      .gte('visible_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('kickoff_date', { ascending: true }),
    supabase.from('group_members').select('group_id').eq('user_id', userId).eq('role', 'admin'),
  ]);

  if (error) throw error;

  const adminGroupIds = new Set((adminGroups ?? []).map((row) => row.group_id));

  const processed: GameWithPlayers[] = ((games as RawGame[]) ?? []).map((game) => ({
    ...game,
    group_name: game.group?.name ?? null,
    player_games: (game.player_games ?? []) as PlayerGameWithProfile[],
    player_count: game.player_games?.length ?? 0,
    user_signed_up: game.player_games?.some((pg) => pg.user_id === userId) ?? false,
  }));

  const visible: GameListItem[] = processed
    .map((game) => ({ game, status: getGameVisibilityStatus(game, userId, adminGroupIds) }))
    .filter(({ status }) => status.visible)
    .map(({ game, status }) => ({ ...game, isPreview: status.isPreview }));

  const now = new Date();
  const upcoming = visible.filter((game) => new Date(game.kickoff_date) >= now);
  const past = visible.filter((game) => new Date(game.kickoff_date) < now).reverse();

  return { upcoming, past };
}

function GameCard({ game }: { game: GameListItem }) {
  const capacity = getGameCapacity(game.players_per_team);

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-text">
          {game.team1_name} vs {game.team2_name}
        </span>
        {game.isPreview && (
          <span className="rounded-full bg-background-secondary px-2 py-0.5 text-xs font-medium text-text-tertiary">
            Not visible yet
          </span>
        )}
      </div>
      {game.group_name && (
        <span className="text-sm font-medium text-primary">{game.group_name}</span>
      )}
      <span className="text-sm text-text-secondary">
        {formatDate(game.kickoff_date)} · {formatTime(game.kickoff_date)}
      </span>
      <span className="text-sm text-text-tertiary">
        {game.player_count}/{capacity} signed up
        {game.user_signed_up ? ' · You’re in' : ''}
      </span>
    </>
  );

  return (
    <Link
      href={`/games/${game.id}`}
      className={`flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary ${
        game.isPreview ? 'opacity-60' : ''
      }`}
    >
      {content}
    </Link>
  );
}

export default async function GamesPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const { upcoming, past } = await loadGames(user.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Games</h1>
        <Link
          href="/games/new"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          + Create
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Upcoming games</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-text-secondary">No upcoming games yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text">Past games</h2>
          <div className="flex flex-col gap-3">
            {past.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
