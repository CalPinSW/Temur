import { notFound, redirect } from 'next/navigation';
import { type Game, isGameAdmin } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { EditGameForm } from './EditGameForm';

export default async function EditGamePage({ params }: PageProps<'/games/[id]/edit'>) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data: game, error }, { data: adminGroups }] = await Promise.all([
    supabase.from('games').select('*').eq('id', id).single(),
    supabase.from('group_members').select('group_id').eq('user_id', user.id).eq('role', 'admin'),
  ]);

  if (error || !game) notFound();

  const adminGroupIds = new Set((adminGroups ?? []).map((row) => row.group_id));
  if (!isGameAdmin(game as Game, user.id, adminGroupIds)) {
    redirect(`/games/${id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Edit Game</h1>
      <EditGameForm
        gameId={id}
        initial={{
          gameDescription: game.game_description ?? '',
          kickoffDate: game.kickoff_date,
          visibleAt: game.visible_at,
          team1Name: game.team1_name,
          team2Name: game.team2_name,
          playersPerTeam: game.players_per_team,
        }}
      />
    </div>
  );
}
