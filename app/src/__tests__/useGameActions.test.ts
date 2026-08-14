import { Alert, AlertButton } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { GameWithPlayers, PlayerGameWithProfile } from '@/types/game';

jest.mock('@/services/supabase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference outer imports (hoisting)
  const { createSupabaseMock } = require('./testUtils/supabaseMock');
  return { supabase: createSupabaseMock() };
});

import { supabase } from '@/services/supabase';
import { createQueryBuilder, mockFromTables, SupabaseMock } from './testUtils/supabaseMock';
import { useGameActions } from '@/hooks/useGameActions';

const mockSupabase = supabase as unknown as SupabaseMock;

function makeGame(overrides: Partial<GameWithPlayers> = {}): GameWithPlayers {
  return {
    id: 'game-1',
    kickoff_date: '2026-03-05T18:30:00.000Z',
    visible_at: '2026-02-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    team1_name: 'Team A',
    team2_name: 'Team B',
    players_per_team: 7,
    group_id: null,
    created_by: null,
    ringers_opened_at: null,
    ringers_opened_by: null,
    player_games: [],
    player_count: 3,
    user_signed_up: false,
    ...overrides,
  };
}

function makePlayerGame(signupOrder: number): PlayerGameWithProfile {
  return {
    id: `pg-${signupOrder}`,
    game_id: 'game-1',
    user_id: `user-${signupOrder}`,
    signup_order: signupOrder,
    team: null,
    board_x: null,
    board_y: null,
    created_at: '',
    updated_at: '',
    is_ringer: false,
    guest_name: null,
    added_by: null,
    profile: {
      id: `user-${signupOrder}`,
      username: `p${signupOrder}`,
      display_name: null,
      avatar_url: null,
    },
  };
}

describe('useGameActions', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('handleSignUp', () => {
    it('inserts a player_games row at the next signup position and calls onSuccess', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { player_games: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useGameActions('game-1', 'user-1'));

      await act(async () => {
        await result.current.handleSignUp(
          makeGame({ player_games: [makePlayerGame(1), makePlayerGame(2), makePlayerGame(3)] }),
          onSuccess
        );
      });

      expect(builder.insert).toHaveBeenCalledWith({
        game_id: 'game-1',
        user_id: 'user-1',
        signup_order: 4,
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Success', expect.any(String));
      expect(result.current.isSigningUp).toBe(false);
    });

    it('signs up at max(signup_order) + 1, not player_count + 1, so a gap left by a withdrawal does not collide', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { player_games: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useGameActions('game-1', 'user-1'));

      // player 3 withdrew, leaving signup_order 1, 2, 4 (3 rows, but max is 4)
      await act(async () => {
        await result.current.handleSignUp(
          makeGame({
            player_count: 3,
            player_games: [makePlayerGame(1), makePlayerGame(2), makePlayerGame(4)],
          }),
          onSuccess
        );
      });

      expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ signup_order: 5 }));
    });

    it('shows a specific message for a duplicate signup', async () => {
      const builder = createQueryBuilder({ data: null, error: { code: '23505' } });
      mockFromTables(mockSupabase, { player_games: builder });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useGameActions('game-1', 'user-1'));

      await act(async () => {
        await result.current.handleSignUp(makeGame(), onSuccess);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Error', 'You are already signed up for this game');
    });

    it('does nothing without a logged-in user', async () => {
      const { result } = renderHook(() => useGameActions('game-1', undefined));

      await act(async () => {
        await result.current.handleSignUp(makeGame(), jest.fn());
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('handleWithdraw', () => {
    it('confirms, then deletes the player_games row on confirm', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      mockFromTables(mockSupabase, { player_games: builder });
      const onSuccess = jest.fn();
      const game = makeGame({
        player_games: [
          {
            id: 'pg-1',
            game_id: 'game-1',
            user_id: 'user-1',
            signup_order: 2,
            team: null,
            board_x: null,
            board_y: null,
            created_at: '',
            updated_at: '',
            is_ringer: false,
            guest_name: null,
            added_by: null,
            profile: { id: 'user-1', username: 'me', display_name: null, avatar_url: null },
          },
        ],
      });
      const { result } = renderHook(() => useGameActions('game-1', 'user-1'));

      result.current.handleWithdraw(game, onSuccess);

      expect(alertSpy).toHaveBeenCalledWith(
        'Withdraw from Game',
        expect.stringContaining('position 2'),
        expect.any(Array)
      );

      const buttons = alertSpy.mock.calls[0][2];
      const withdrawButton = buttons.find((b: AlertButton) => b.text === 'Withdraw')!;

      await act(async () => {
        await withdrawButton.onPress!();
      });

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('game_id', 'game-1');
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
