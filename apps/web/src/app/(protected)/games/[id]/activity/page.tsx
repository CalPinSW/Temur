import { notFound, redirect } from 'next/navigation';
import {
  type Game,
  type GameSignupEvent,
  formatDate,
  isGameAdmin,
  describeGameSignupEvent,
  formatSignupEventTime,
  GAME_SIGNUP_EVENT_SELECT,
} from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function GameActivityPage({ params }: PageProps<'/games/[id]/activity'>) {
  const { id: gameId } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data: game, error }, { data: adminGroups }] = await Promise.all([
    supabase
      .from('games')
      .select('id, team1_name, team2_name, kickoff_date, group_id, created_by')
      .eq('id', gameId)
      .single(),
    supabase.from('group_members').select('group_id').eq('user_id', user.id).eq('role', 'admin'),
  ]);

  if (error || !game) notFound();

  const adminGroupIds = new Set((adminGroups ?? []).map((row) => row.group_id));
  if (!isGameAdmin(game as Pick<Game, 'group_id' | 'created_by'>, user.id, adminGroupIds)) {
    redirect(`/games/${gameId}`);
  }

  const { data: eventRows } = await supabase
    .from('game_signup_events')
    .select(GAME_SIGNUP_EVENT_SELECT)
    .eq('game_id', gameId)
    .order('created_at', { ascending: false });
  const events = (eventRows ?? []) as unknown as GameSignupEvent[];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text">Activity Log</h1>
        <p className="text-sm text-text-secondary">
          {game.team1_name} vs {game.team2_name} · {formatDate(game.kickoff_date)}
        </p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-text-secondary">No one has joined or left this game yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-light px-3 py-2 text-sm"
            >
              <span className="text-text">{describeGameSignupEvent(event)}</span>
              <time dateTime={event.created_at} className="shrink-0 text-xs text-text-tertiary">
                {formatSignupEventTime(event.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
