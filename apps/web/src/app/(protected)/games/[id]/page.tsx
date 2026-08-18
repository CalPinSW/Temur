import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  type Game,
  type GameOutcome,
  type Profile,
  type PlayerGameWithProfile,
  formatDate,
  formatTime,
  formatGameResult,
  getGameCapacity,
  getActivePlayers,
  getWaitlistPlayers,
  getPlayerDisplayName,
  isGameAdmin,
  getGameVisibilityStatus,
} from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { SignupActions } from './SignupActions';
import { OpenRingersSection } from './OpenRingersSection';
import { AddRingerSection } from './AddRingerSection';
import { RemoveRingerButton } from './RemoveRingerButton';
import { DeleteGameButton } from './DeleteGameButton';
import { PublishGameButton } from './PublishGameButton';
import { InviteFriendsSection } from './InviteFriendsSection';

interface RawGame extends Game {
  player_games: PlayerGameWithProfile[] | null;
}

interface RawFriendship {
  friend: Profile | Profile[];
}

interface RatingSummary {
  player_game_id: string;
  average_rating: number;
  rating_count: number;
}

function PlayerRow({
  player,
  position,
  gameId,
  currentUserId,
  isAdmin,
}: {
  player: PlayerGameWithProfile;
  position: number;
  gameId: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const canRemoveRinger =
    player.is_ringer && (player.added_by === currentUserId || isAdmin);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border-light px-3 py-2 text-sm">
      <span className="w-5 text-text-tertiary">{position}</span>
      <span className="flex-1 text-text">{getPlayerDisplayName(player)}</span>
      {player.is_ringer && (
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
          Ringer
        </span>
      )}
      {player.average_rating !== undefined && (
        <span className="text-xs text-text-tertiary">
          ★ {player.average_rating.toFixed(1)} ({player.rating_count})
        </span>
      )}
      {player.team != null && (
        <span className="text-xs text-text-tertiary">Team {player.team}</span>
      )}
      {canRemoveRinger && (
        <RemoveRingerButton
          gameId={gameId}
          playerGameId={player.id}
          ringerName={getPlayerDisplayName(player)}
        />
      )}
    </li>
  );
}

export default async function GameDetailPage({ params }: PageProps<'/games/[id]'>) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [{ data, error }, { data: adminGroups }] = await Promise.all([
    supabase
      .from('games')
      .select(
        `*, player_games (
          id, user_id, signup_order, team, created_at, is_ringer, guest_name, added_by,
          profile:profiles!player_games_user_id_fkey ( id, username, display_name, avatar_url )
        )`
      )
      .eq('id', id)
      .single(),
    supabase.from('group_members').select('group_id').eq('user_id', user.id).eq('role', 'admin'),
  ]);

  if (error || !data) {
    notFound();
  }

  const game = data as RawGame;
  const adminGroupIds = new Set((adminGroups ?? []).map((row) => row.group_id));
  const isAdmin = isGameAdmin(game, user.id, adminGroupIds);

  // Not yet visible and this user isn't an admin who gets an early preview
  // — can_view_game's RLS doesn't consider visible_at at all (only group
  // membership/creator/invite), so without this check a group member could
  // still reach this page directly even though every list view hides it.
  const visibility = getGameVisibilityStatus(game, user.id, adminGroupIds);
  if (!visibility.visible) {
    notFound();
  }

  const isPast = new Date(game.kickoff_date) < new Date();

  let invitableFriends: Profile[] = [];
  if (isAdmin) {
    const [{ data: sentFriendships }, { data: receivedFriendships }, { data: groupMemberRows }] =
      await Promise.all([
        supabase
          .from('friendships')
          .select('friend:profiles!friendships_friend_id_fkey(*)')
          .eq('user_id', user.id)
          .eq('status', 'accepted'),
        supabase
          .from('friendships')
          .select('friend:profiles!friendships_user_id_fkey(*)')
          .eq('friend_id', user.id)
          .eq('status', 'accepted'),
        game.group_id
          ? supabase.from('group_members').select('user_id').eq('group_id', game.group_id)
          : Promise.resolve({ data: null }),
      ]);

    const toProfile = (item: RawFriendship) =>
      Array.isArray(item.friend) ? item.friend[0] : item.friend;
    const allFriends = [
      ...((sentFriendships as unknown as RawFriendship[]) ?? []),
      ...((receivedFriendships as unknown as RawFriendship[]) ?? []),
    ].map(toProfile);
    const friends = allFriends.filter(
      (friend, index, self) => index === self.findIndex((f) => f.id === friend.id)
    );

    // For a group game, members already have access via group membership —
    // "inviting" them wouldn't do anything, so only friends outside the
    // group are offered. Doing this never adds an invitee to the group
    // itself, only to this one game (see can_view_game's game_invitations
    // fallback).
    const groupMemberIds = new Set((groupMemberRows ?? []).map((row) => row.user_id));
    const signedUpIds = new Set((game.player_games ?? []).map((pg) => pg.user_id));
    invitableFriends = friends.filter(
      (friend) => !signedUpIds.has(friend.id) && !groupMemberIds.has(friend.id)
    );
  }
  let players = (game.player_games ?? []).slice().sort((a, b) => a.signup_order - b.signup_order);

  if (isPast && players.length > 0) {
    const { data: summaryData } = await supabase.rpc('get_player_rating_summary', {
      p_player_game_ids: players.map((p) => p.id),
    });

    if (summaryData) {
      const summaryByPlayer = new Map(
        (summaryData as RatingSummary[]).map((s) => [s.player_game_id, s])
      );
      players = players.map((p) => {
        const summary = summaryByPlayer.get(p.id);
        return {
          ...p,
          average_rating: summary ? Number(summary.average_rating) : undefined,
          rating_count: summary ? summary.rating_count : undefined,
        };
      });
    }
  }

  const capacity = getGameCapacity(game.players_per_team);
  const activePlayers = getActivePlayers(players, capacity);
  const waitlistPlayers = getWaitlistPlayers(players, capacity);
  const isSignedUp = players.some((p) => p.user_id === user.id);
  const isCreator = game.created_by === user.id;
  const resultOutcome = game.result_outcome as GameOutcome | null;
  const hasResult = game.result_team1_score !== null || resultOutcome !== null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-text">
            {game.team1_name} vs {game.team2_name}
          </h1>
          {visibility.isPreview && (
            <span className="rounded-full bg-background-secondary px-2 py-0.5 text-xs font-medium text-text-tertiary">
              Not visible yet
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary">
          {formatDate(game.kickoff_date)} · {formatTime(game.kickoff_date)}
        </p>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-light px-3 py-2">
          <Link
            href={`/games/${game.id}/edit`}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            Edit Game
          </Link>
          {visibility.isPreview && <PublishGameButton gameId={game.id} />}
        </div>
      )}

      {!visibility.isPreview && <SignupActions gameId={game.id} isSignedUp={isSignedUp} />}

      {isAdmin && players.length > 0 && (
        <Link
          href={`/games/${game.id}/team-assignment`}
          className="self-start rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Assign Teams
        </Link>
      )}

      {isPast && (
        <section className="flex flex-col gap-2 rounded-lg border border-border-light px-3 py-2">
          <p className="text-sm text-text-secondary">
            {formatGameResult(
              game.team1_name,
              game.team2_name,
              game.result_team1_score,
              game.result_team2_score,
              resultOutcome
            ) ?? 'No result entered yet'}
          </p>
          <Link
            href={`/games/${game.id}/result`}
            className="self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-secondary"
          >
            {hasResult ? 'View / Edit Result' : 'Enter Result'}
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-secondary">
          Signed up ({activePlayers.length}/{capacity})
        </h2>
        <ul className="flex flex-col gap-1">
          {activePlayers.map((player, i) => (
            <PlayerRow
              key={player.id}
              player={player}
              position={i + 1}
              gameId={game.id}
              currentUserId={user.id}
              isAdmin={isAdmin}
            />
          ))}
        </ul>
      </section>

      {!!game.group_id && !!game.ringers_opened_at && !isPast && !visibility.isPreview && (
        <AddRingerSection gameId={game.id} />
      )}

      {isAdmin && !!game.group_id && !visibility.isPreview && (
        <>
          {game.ringers_opened_at ? (
            <p className="text-sm text-text-secondary">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Open to ringers
              </span>
            </p>
          ) : (
            <OpenRingersSection gameId={game.id} groupId={game.group_id} />
          )}
        </>
      )}

      {isAdmin && (
        <InviteFriendsSection
          gameId={game.id}
          invitableFriends={invitableFriends}
          isGroupGame={!!game.group_id}
        />
      )}

      {waitlistPlayers.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text-secondary">
            Waitlist ({waitlistPlayers.length})
          </h2>
          <ul className="flex flex-col gap-1">
            {waitlistPlayers.map((player, i) => (
              <PlayerRow
                key={player.id}
                player={player}
                position={capacity + i + 1}
                gameId={game.id}
                currentUserId={user.id}
                isAdmin={isAdmin}
              />
            ))}
          </ul>
        </section>
      )}

      {isCreator && (
        <section className="flex flex-col gap-2 self-start">
          <DeleteGameButton gameId={game.id} />
        </section>
      )}
    </div>
  );
}
