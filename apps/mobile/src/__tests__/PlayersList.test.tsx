import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PlayerGameWithProfile } from '@temur/shared';
import { PlayersList } from '@/components/game/PlayersList';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      border: '#ccc',
      backgroundTertiary: '#eee',
      textSecondary: '#888',
    },
  }),
}));

const makePlayer = (overrides: Partial<PlayerGameWithProfile>): PlayerGameWithProfile =>
  ({
    id: `pg-${overrides.signup_order}`,
    game_id: 'game-1',
    user_id: `user-${overrides.signup_order}`,
    signup_order: 1,
    team: null,
    is_ringer: false,
    guest_name: null,
    added_by: null,
    board_position_x: null,
    board_position_y: null,
    created_at: '',
    profile: {
      id: `user-${overrides.signup_order}`,
      username: `player${overrides.signup_order}`,
      display_name: `Player ${overrides.signup_order}`,
      avatar_url: null,
    },
    ...overrides,
  }) as PlayerGameWithProfile;

const makePlayers = (count: number) =>
  Array.from({ length: count }, (_, i) => makePlayer({ signup_order: i + 1 }));

const noop = () => {};

describe('PlayersList', () => {
  it('shows every player and no expand button when there are 5 or fewer', () => {
    render(<PlayersList players={makePlayers(5)} isExpanded={false} onToggleExpand={noop} />);

    expect(screen.getByText('1. Player 1')).toBeTruthy();
    expect(screen.getByText('5. Player 5')).toBeTruthy();
    expect(screen.queryByText(/Show All/)).toBeNull();
  });

  it('collapses to the first 5 and offers to show the rest when there are more than 5', () => {
    render(<PlayersList players={makePlayers(9)} isExpanded={false} onToggleExpand={noop} />);

    expect(screen.getByText('1. Player 1')).toBeTruthy();
    expect(screen.getByText('5. Player 5')).toBeTruthy();
    expect(screen.queryByText('6. Player 6')).toBeNull();
    expect(screen.getByText('Show All 9 Players')).toBeTruthy();
  });

  it('renders all players once expanded', () => {
    render(<PlayersList players={makePlayers(9)} isExpanded onToggleExpand={noop} />);

    expect(screen.getByText('9. Player 9')).toBeTruthy();
    expect(screen.getByText('Show Less')).toBeTruthy();
  });

  it('fires onToggleExpand when the button is pressed', () => {
    const onToggleExpand = jest.fn();
    render(
      <PlayersList players={makePlayers(9)} isExpanded={false} onToggleExpand={onToggleExpand} />
    );

    fireEvent.press(screen.getByText('Show All 9 Players'));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('keeps the collapsed window centred on the current user', () => {
    render(
      <PlayersList
        players={makePlayers(12)}
        currentUserId="user-8"
        isExpanded={false}
        onToggleExpand={noop}
      />
    );

    expect(screen.getByText('6. Player 6')).toBeTruthy();
    expect(screen.getByText('10. Player 10')).toBeTruthy();
    expect(screen.queryByText('1. Player 1')).toBeNull();
    expect(screen.queryByText('11. Player 11')).toBeNull();
  });

  it('offsets the displayed position by positionOffset (waitlist numbering)', () => {
    render(
      <PlayersList
        players={makePlayers(3)}
        isExpanded={false}
        onToggleExpand={noop}
        positionOffset={10}
      />
    );

    expect(screen.getByText('11. Player 1')).toBeTruthy();
    expect(screen.getByText('13. Player 3')).toBeTruthy();
  });
});
