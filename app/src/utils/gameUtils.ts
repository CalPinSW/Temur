import { Game, GameOutcome, PlayerGameWithProfile } from '@/types/game';

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getGameCapacity = (playersPerTeam: number) => {
  return playersPerTeam * 2;
};

export const getActivePlayers = (players: PlayerGameWithProfile[], capacity: number) => {
  return players.filter((p) => p.signup_order <= capacity);
};

export const getWaitlistPlayers = (players: PlayerGameWithProfile[], capacity: number) => {
  return players.filter((p) => p.signup_order > capacity);
};

export const getVisiblePlayers = (
  players: PlayerGameWithProfile[],
  capacity: number,
  isExpanded: boolean,
  userId?: string,
  teamNumber?: number,
  isWaitlist: boolean = false
) => {
  let filteredPlayers: PlayerGameWithProfile[];

  if (isWaitlist) {
    filteredPlayers = getWaitlistPlayers(players, capacity);
  } else {
    const activePlayers = getActivePlayers(players, capacity);
    filteredPlayers =
      teamNumber !== undefined
        ? activePlayers.filter((p) => p.team === teamNumber)
        : activePlayers.filter((p) => p.team === null);
  }

  if (isExpanded || filteredPlayers.length <= 5) {
    return filteredPlayers;
  }

  const userPlayerIndex = filteredPlayers.findIndex((p) => p.user_id === userId);

  if (userPlayerIndex !== -1) {
    const start = Math.max(0, userPlayerIndex - 2);
    const end = Math.min(filteredPlayers.length, userPlayerIndex + 3);
    return filteredPlayers.slice(start, end);
  }

  return filteredPlayers.slice(0, 5);
};

export const getPlayerDisplayName = (pg: PlayerGameWithProfile): string =>
  pg.is_ringer
    ? (pg.guest_name ?? 'Guest')
    : pg.profile?.display_name || pg.profile?.username || '';

export const getNextSignupOrder = (players: PlayerGameWithProfile[]): number =>
  players.length === 0 ? 1 : Math.max(...players.map((p) => p.signup_order)) + 1;

export const isGameAdmin = (
  game: Pick<Game, 'group_id' | 'created_by'>,
  userId: string | undefined,
  adminGroupIds: Set<string>
): boolean => {
  if (!userId) return false;
  return game.group_id ? adminGroupIds.has(game.group_id) : game.created_by === userId;
};

export const formatGameResult = (
  team1Name: string,
  team2Name: string,
  team1Score: number | null,
  team2Score: number | null,
  outcome: GameOutcome | null
): string | null => {
  if (team1Score !== null && team2Score !== null) {
    return `${team1Name} ${team1Score} - ${team2Score} ${team2Name}`;
  }
  if (outcome === 'team1_win') return `${team1Name} won`;
  if (outcome === 'team2_win') return `${team2Name} won`;
  if (outcome === 'draw') return 'Draw';
  return null;
};

export const getTeamCounts = (teamAssignments: Record<string, number | null>) => {
  const counts = { team1: 0, team2: 0, unassigned: 0 };
  Object.values(teamAssignments).forEach((team) => {
    if (team === 1) counts.team1++;
    else if (team === 2) counts.team2++;
    else counts.unassigned++;
  });
  return counts;
};
