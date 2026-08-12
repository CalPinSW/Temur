import { PlayerGameWithProfile } from '@/types/game';

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

export const getTeamCounts = (teamAssignments: Record<string, number | null>) => {
  const counts = { team1: 0, team2: 0, unassigned: 0 };
  Object.values(teamAssignments).forEach((team) => {
    if (team === 1) counts.team1++;
    else if (team === 2) counts.team2++;
    else counts.unassigned++;
  });
  return counts;
};
