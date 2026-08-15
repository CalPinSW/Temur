import {
  seedFromPlayers,
  assignTeam,
  moveOnBoard,
  autoAssign,
  clearAll,
  buildSavePayload,
  type AssignmentState,
} from '../teamAssignmentState';

describe('seedFromPlayers', () => {
  it('seeds team assignments and board positions from player rows', () => {
    const state = seedFromPlayers([
      { id: 'pg-1', team: null, board_x: null, board_y: null },
      { id: 'pg-2', team: 1, board_x: 10, board_y: 20 },
    ]);

    expect(state.assignments).toEqual({ 'pg-1': null, 'pg-2': 1 });
    expect(state.positions).toEqual({ 'pg-1': null, 'pg-2': { x: 10, y: 20 } });
  });

  it('treats a half-set board position as unset (defensive against inconsistent rows)', () => {
    const state = seedFromPlayers([{ id: 'pg-1', team: 1, board_x: 5, board_y: null }]);

    expect(state.positions['pg-1']).toBeNull();
  });

  it('returns empty records for no players', () => {
    expect(seedFromPlayers([])).toEqual({ assignments: {}, positions: {} });
  });
});

describe('assignTeam', () => {
  it('sets the team and clears the board position', () => {
    const initial: AssignmentState = {
      assignments: { 'pg-1': null },
      positions: { 'pg-1': { x: 0.3, y: 0.4 } },
    };

    const next = assignTeam(initial, 'pg-1', 2);

    expect(next.assignments['pg-1']).toBe(2);
    expect(next.positions['pg-1']).toBeNull();
  });

  it('does not mutate the input state', () => {
    const initial: AssignmentState = { assignments: { 'pg-1': null }, positions: { 'pg-1': null } };
    assignTeam(initial, 'pg-1', 1);
    expect(initial.assignments['pg-1']).toBeNull();
  });

  it('unassigns when given null', () => {
    const initial: AssignmentState = { assignments: { 'pg-1': 1 }, positions: { 'pg-1': null } };
    const next = assignTeam(initial, 'pg-1', null);
    expect(next.assignments['pg-1']).toBeNull();
  });
});

describe('moveOnBoard', () => {
  it('sets both team and position together', () => {
    const initial: AssignmentState = { assignments: { 'pg-1': null }, positions: { 'pg-1': null } };

    const next = moveOnBoard(initial, 'pg-1', 1, { x: 0.5, y: 0.6 });

    expect(next.assignments['pg-1']).toBe(1);
    expect(next.positions['pg-1']).toEqual({ x: 0.5, y: 0.6 });
  });

  it('dropping back in the pool clears both team and position', () => {
    const initial: AssignmentState = {
      assignments: { 'pg-1': 1 },
      positions: { 'pg-1': { x: 0.5, y: 0.6 } },
    };

    const next = moveOnBoard(initial, 'pg-1', null, null);

    expect(next.assignments['pg-1']).toBeNull();
    expect(next.positions['pg-1']).toBeNull();
  });
});

describe('autoAssign', () => {
  it('alternates players between the two teams in order', () => {
    const state = autoAssign(['pg-1', 'pg-2', 'pg-3', 'pg-4']);

    expect(state.assignments).toEqual({ 'pg-1': 1, 'pg-2': 2, 'pg-3': 1, 'pg-4': 2 });
  });

  it('clears any existing board positions', () => {
    const state = autoAssign(['pg-1', 'pg-2']);
    expect(state.positions).toEqual({ 'pg-1': null, 'pg-2': null });
  });

  it('handles an empty player list', () => {
    expect(autoAssign([])).toEqual({ assignments: {}, positions: {} });
  });
});

describe('clearAll', () => {
  it('unassigns every player and clears all board positions', () => {
    const state = clearAll(['pg-1', 'pg-2']);
    expect(state).toEqual({
      assignments: { 'pg-1': null, 'pg-2': null },
      positions: { 'pg-1': null, 'pg-2': null },
    });
  });
});

describe('buildSavePayload', () => {
  it('maps each player to a save row using its current assignment and position', () => {
    const state: AssignmentState = {
      assignments: { 'pg-1': 1, 'pg-2': null },
      positions: { 'pg-1': { x: 10, y: 20 }, 'pg-2': null },
    };

    const payload = buildSavePayload(['pg-1', 'pg-2'], state);

    expect(payload).toEqual([
      { id: 'pg-1', team: 1, board_x: 10, board_y: 20 },
      { id: 'pg-2', team: null, board_x: null, board_y: null },
    ]);
  });

  it('defaults to nulls for a player missing from the state entirely', () => {
    const state: AssignmentState = { assignments: {}, positions: {} };
    expect(buildSavePayload(['pg-1'], state)).toEqual([
      { id: 'pg-1', team: null, board_x: null, board_y: null },
    ]);
  });
});
