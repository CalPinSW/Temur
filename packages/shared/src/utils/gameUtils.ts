import { Game, GameOutcome, PlayerGameWithProfile } from '../types/game';

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

export const getInitials = (
  displayName?: string | null,
  username?: string | null
): string => {
  if (displayName) {
    return displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return username?.slice(0, 2).toUpperCase() || '??';
};

export const getNextSignupOrder = (players: Pick<PlayerGameWithProfile, 'signup_order'>[]): number =>
  players.length === 0 ? 1 : Math.max(...players.map((p) => p.signup_order)) + 1;

export const isGameAdmin = (
  game: Pick<Game, 'group_id' | 'created_by'>,
  userId: string | undefined,
  adminGroupIds: Set<string>
): boolean => {
  if (!userId) return false;
  return game.group_id ? adminGroupIds.has(game.group_id) : game.created_by === userId;
};

export interface GameVisibilityStatus {
  // Whether this game should appear in a games list at all.
  visible: boolean;
  // Admin-only early view: visible to this user via their admin status
  // alone, not yet visible to everyone via visible_at. List UIs use this to
  // grey the item out and disable navigating into it.
  isPreview: boolean;
}

export const getGameVisibilityStatus = (
  game: Pick<Game, 'visible_at' | 'group_id' | 'created_by'>,
  userId: string | undefined,
  adminGroupIds: Set<string>
): GameVisibilityStatus => {
  if (new Date(game.visible_at) <= new Date()) return { visible: true, isPreview: false };
  const admin = isGameAdmin(game, userId, adminGroupIds);
  return { visible: admin, isPreview: admin };
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

const VISIBLE_AT_LEAD_DAYS = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isSameDay = (date1: Date, date2: Date): boolean =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

export const getNextSaturday = (fromDate: Date): Date => {
  const date = new Date(fromDate);
  date.setHours(10, 45, 0, 0);
  const dayOfWeek = date.getDay();
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek + 7) % 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return date;
};

// Picks the next Saturday kickoff that doesn't collide with an existing
// game, stepping forward a week at a time until it finds a free slot.
export const getDefaultKickoffDate = (existingKickoffDates: Date[]): Date => {
  let candidate = getNextSaturday(new Date());
  while (existingKickoffDates.some((d) => isSameDay(d, candidate))) {
    candidate = getNextSaturday(new Date(candidate.getTime() + 7 * MS_PER_DAY));
  }
  return candidate;
};

// visible_at's default always tracks kickoff_date: exactly 7 days earlier,
// at the same time of day. Re-run this whenever kickoff changes, unless the
// admin has manually edited visible_at themselves.
export const getDefaultVisibleAt = (kickoffDate: Date): Date =>
  new Date(kickoffDate.getTime() - VISIBLE_AT_LEAD_DAYS * MS_PER_DAY);

export const isVisibleAtBeforeKickoff = (kickoffDate: Date, visibleAt: Date): boolean =>
  visibleAt.getTime() <= kickoffDate.getTime();

export const getTeamCounts = (teamAssignments: Record<string, number | null>) => {
  const counts = { team1: 0, team2: 0, unassigned: 0 };
  Object.values(teamAssignments).forEach((team) => {
    if (team === 1) counts.team1++;
    else if (team === 2) counts.team2++;
    else counts.unassigned++;
  });
  return counts;
};
