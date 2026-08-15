import { notFound } from 'next/navigation';
import { formatDate, type Game, type GameOutcome, type PlayerGameWithProfile } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { GameResultForm } from './GameResultForm';
import { RatingsForm } from './RatingsForm';

interface RawGame extends Game {
  player_games: PlayerGameWithProfile[] | null;
}

export default async function GameResultPage({ params }: PageProps<'/games/[id]/result'>) {
  const { id: gameId } = await params;
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
    .eq('id', gameId)
    .single();

  if (error || !data) notFound();

  const game = data as RawGame;
  const players = game.player_games ?? [];
  const ratablePlayers = players.filter((pg) => pg.user_id !== user!.id);
  const ratablePlayerIds = ratablePlayers.map((pg) => pg.id);

  const { data: myRatings } =
    ratablePlayerIds.length > 0
      ? await supabase
          .from('player_ratings')
          .select('player_game_id, rating')
          .eq('rated_by', user!.id)
          .in('player_game_id', ratablePlayerIds)
      : { data: [] };

  const initialRatings = Object.fromEntries(
    (myRatings ?? []).map((r) => [r.player_game_id, r.rating])
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text">
          {game.team1_name} vs {game.team2_name}
        </h1>
        <p className="text-sm text-text-secondary">{formatDate(game.kickoff_date)}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-text-secondary">Result</h2>
        <GameResultForm
          gameId={gameId}
          team1Name={game.team1_name}
          team2Name={game.team2_name}
          resultTeam1Score={game.result_team1_score}
          resultTeam2Score={game.result_team2_score}
          resultOutcome={game.result_outcome as GameOutcome | null}
        />
      </section>

      {ratablePlayers.length > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-text-secondary">Rate Players</h2>
          <RatingsForm
            gameId={gameId}
            team1Name={game.team1_name}
            team2Name={game.team2_name}
            ratablePlayers={ratablePlayers}
            initialRatings={initialRatings}
          />
        </section>
      )}
    </div>
  );
}
