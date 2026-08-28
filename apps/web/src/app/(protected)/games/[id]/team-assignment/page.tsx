import { notFound, redirect } from 'next/navigation';
import {
  formatDate,
  formatTime,
  getActivePlayers,
  getGameCapacity,
  isGameAdmin,
  type Game,
  type PlayerGameWithProfile,
} from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { TeamAssignmentClient } from './TeamAssignmentClient';

interface RawGame extends Game {
  player_games: PlayerGameWithProfile[] | null;
}

export default async function TeamAssignmentPage({
  params,
}: PageProps<'/games/[id]/team-assignment'>) {
  const { id: gameId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data, error }, { data: adminGroups }] = await Promise.all([
    supabase
      .from('games')
      .select(
        `*, player_games (
          id, user_id, signup_order, team, board_x, board_y, is_ringer, guest_name, added_by,
          profile:profiles!player_games_user_id_fkey ( id, username, display_name, avatar_url )
        )`
      )
      .eq('id', gameId)
      .single(),
    supabase.from('group_members').select('group_id').eq('user_id', user.id).eq('role', 'admin'),
  ]);

  if (error || !data) notFound();

  const game = data as RawGame;
  const adminGroupIds = new Set((adminGroups ?? []).map((row) => row.group_id));
  const isAdmin = isGameAdmin(game, user.id, adminGroupIds);

  if (!isAdmin) redirect(`/games/${gameId}`);

  let defaultNotifyMessage = '';
  if (game.group_id) {
    const { data: group } = await supabase
      .from('groups')
      .select('team_assignment_message_template')
      .eq('id', game.group_id)
      .single();
    defaultNotifyMessage = group?.team_assignment_message_template ?? '';
  }

  const capacity = getGameCapacity(game.players_per_team);
  const sortedPlayers = (game.player_games ?? [])
    .slice()
    .sort((a, b) => a.signup_order - b.signup_order);
  const activePlayers = getActivePlayers(sortedPlayers, capacity);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text">Assign Teams</h1>
        <p className="text-sm text-text-secondary">
          {formatDate(game.kickoff_date)} at {formatTime(game.kickoff_date)}
        </p>
        <p className="text-xs text-text-tertiary">
          Assigning {activePlayers.length} players ({game.players_per_team} per team)
        </p>
      </div>

      <TeamAssignmentClient
        gameId={gameId}
        players={activePlayers}
        team1Name={game.team1_name}
        team2Name={game.team2_name}
        defaultNotifyMessage={defaultNotifyMessage}
      />
    </div>
  );
}
