import { type BoardPosition } from '@temur/shared';

export type Assignments = Record<string, number | null>;
export type Positions = Record<string, BoardPosition | null>;

export interface AssignmentState {
  assignments: Assignments;
  positions: Positions;
}

interface SeedablePlayer {
  id: string;
  team: number | null;
  board_x: number | null;
  board_y: number | null;
}

export function seedFromPlayers(players: SeedablePlayer[]): AssignmentState {
  const assignments: Assignments = {};
  const positions: Positions = {};
  players.forEach((p) => {
    assignments[p.id] = p.team;
    positions[p.id] =
      p.board_x !== null && p.board_y !== null ? { x: p.board_x, y: p.board_y } : null;
  });
  return { assignments, positions };
}

export function assignTeam(
  state: AssignmentState,
  playerGameId: string,
  team: number | null
): AssignmentState {
  return {
    assignments: { ...state.assignments, [playerGameId]: team },
    positions: { ...state.positions, [playerGameId]: null },
  };
}

export function moveOnBoard(
  state: AssignmentState,
  playerGameId: string,
  team: number | null,
  position: BoardPosition | null
): AssignmentState {
  return {
    assignments: { ...state.assignments, [playerGameId]: team },
    positions: { ...state.positions, [playerGameId]: position },
  };
}

export function autoAssign(playerIds: string[]): AssignmentState {
  const assignments: Assignments = {};
  const positions: Positions = {};
  playerIds.forEach((id, index) => {
    assignments[id] = (index % 2) + 1;
    positions[id] = null;
  });
  return { assignments, positions };
}

export function clearAll(playerIds: string[]): AssignmentState {
  const assignments: Assignments = {};
  const positions: Positions = {};
  playerIds.forEach((id) => {
    assignments[id] = null;
    positions[id] = null;
  });
  return { assignments, positions };
}

export interface SaveRow {
  id: string;
  team: number | null;
  board_x: number | null;
  board_y: number | null;
}

export function buildSavePayload(playerIds: string[], state: AssignmentState): SaveRow[] {
  return playerIds.map((id) => ({
    id,
    team: state.assignments[id] ?? null,
    board_x: state.positions[id]?.x ?? null,
    board_y: state.positions[id]?.y ?? null,
  }));
}

export interface NotifyRecipient {
  userId: string;
  team: number;
}

interface NotifiablePlayer {
  id: string;
  user_id: string | null;
}

// Ringers have no user_id (no account to notify), and a player who hasn't
// been assigned a team yet has nothing to be told — both are dropped here
// rather than left for the caller to filter out.
export function buildNotifyRecipients(
  players: NotifiablePlayer[],
  state: AssignmentState
): NotifyRecipient[] {
  const recipients: NotifyRecipient[] = [];
  for (const player of players) {
    const team = state.assignments[player.id];
    if (player.user_id && team) {
      recipients.push({ userId: player.user_id, team });
    }
  }
  return recipients;
}
