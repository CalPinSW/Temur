import { Alert, AlertButton } from 'react-native';
import { renderHook, waitFor, act } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useTeamAssignment } from '@/hooks/useTeamAssignment';

const mockSupabase = supabase as unknown as SupabaseMock;

const gameRow = {
  id: 'game-1',
  players_per_team: 1,
  player_games: [
    {
      id: 'pg-1',
      user_id: 'user-1',
      signup_order: 1,
      team: null,
      board_x: null,
      board_y: null,
      profile: { id: 'user-1', username: 'alice', display_name: null, avatar_url: null },
    },
    {
      id: 'pg-2',
      user_id: 'user-2',
      signup_order: 2,
      team: 1,
      board_x: 10,
      board_y: 20,
      profile: { id: 'user-2', username: 'bob', display_name: null, avatar_url: null },
    },
  ],
};

describe('useTeamAssignment', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  async function setupWithGame() {
    const gamesBuilder = createQueryBuilder({ data: gameRow, error: null });
    mockFromTables(mockSupabase, { games: gamesBuilder });
    const { result } = renderHook(() => useTeamAssignment('game-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    return result;
  }

  it('loads active players within capacity and seeds assignments/positions from the row', async () => {
    const result = await setupWithGame();

    expect(result.current.game?.player_games.map((p) => p.id)).toEqual(['pg-1', 'pg-2']);
    expect(result.current.teamAssignments).toEqual({ 'pg-1': null, 'pg-2': 1 });
    expect(result.current.boardPositions).toEqual({ 'pg-1': null, 'pg-2': { x: 10, y: 20 } });
  });

  it('handleAssignTeam sets the team and clears the board position', async () => {
    const result = await setupWithGame();

    act(() => {
      result.current.handleAssignTeam('pg-1', 2);
    });

    expect(result.current.teamAssignments['pg-1']).toBe(2);
    expect(result.current.boardPositions['pg-1']).toBeNull();
  });

  it('handleMoveOnBoard sets both team and position', async () => {
    const result = await setupWithGame();

    act(() => {
      result.current.handleMoveOnBoard('pg-1', 1, { x: 5, y: 6 });
    });

    expect(result.current.teamAssignments['pg-1']).toBe(1);
    expect(result.current.boardPositions['pg-1']).toEqual({ x: 5, y: 6 });
  });

  it('handleAutoAssign alternates players between the two teams', async () => {
    const result = await setupWithGame();

    act(() => {
      result.current.handleAutoAssign();
    });

    expect(result.current.teamAssignments).toEqual({ 'pg-1': 1, 'pg-2': 2 });
    expect(result.current.boardPositions).toEqual({ 'pg-1': null, 'pg-2': null });
  });

  it('handleClearAll prompts for confirmation and clears assignments on confirm', async () => {
    const result = await setupWithGame();

    act(() => {
      result.current.handleClearAll();
    });

    const buttons = alertSpy.mock.calls[0][2];
    const clearButton = buttons.find((b: AlertButton) => b.text === 'Clear')!;

    act(() => {
      clearButton.onPress!();
    });

    expect(result.current.teamAssignments).toEqual({ 'pg-1': null, 'pg-2': null });
    expect(result.current.boardPositions).toEqual({ 'pg-1': null, 'pg-2': null });
  });

  it('handleSave persists each player_games row and calls onSuccess', async () => {
    const result = await setupWithGame();
    const updateBuilder = createQueryBuilder({ data: null, error: null });
    mockFromTables(mockSupabase, {
      games: createQueryBuilder({ data: gameRow, error: null }),
      player_games: updateBuilder,
    });
    const onSuccess = jest.fn();

    act(() => {
      result.current.handleAssignTeam('pg-1', 1);
    });

    await act(async () => {
      await result.current.handleSave(onSuccess);
    });

    expect(updateBuilder.update).toHaveBeenCalledWith({ team: 1, board_x: null, board_y: null });
    expect(updateBuilder.update).toHaveBeenCalledWith({ team: 1, board_x: 10, board_y: 20 });
    expect(alertSpy).toHaveBeenCalledWith(
      'Success',
      'Team assignments saved successfully!',
      expect.any(Array)
    );

    const okButton = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2][0];
    okButton.onPress();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('handleSave shows an error alert when a save fails', async () => {
    const result = await setupWithGame();
    const updateBuilder = createQueryBuilder({ data: null, error: new Error('write failed') });
    mockFromTables(mockSupabase, {
      games: createQueryBuilder({ data: gameRow, error: null }),
      player_games: updateBuilder,
    });

    await act(async () => {
      await result.current.handleSave(jest.fn());
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Failed to save team assignments. Please try again.'
    );
    expect(result.current.isSaving).toBe(false);
  });
});
