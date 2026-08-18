export type GameOutcome = 'team1_win' | 'team2_win' | 'draw';

export interface Game {
  id: string;
  kickoff_date: string;
  visible_at: string;
  created_at: string;
  updated_at: string;
  team1_name: string;
  team2_name: string;
  players_per_team: number;
  group_id: string | null;
  // Not a real games column — populated by callers that join groups(name)
  // for display, since a game itself doesn't own its group's name.
  group_name?: string | null;
  created_by: string | null;
  ringers_opened_at: string | null;
  ringers_opened_by: string | null;
  result_team1_score: number | null;
  result_team2_score: number | null;
  result_outcome: GameOutcome | null;
}

export interface PlayerGame {
  id: string;
  game_id: string;
  user_id: string | null;
  signup_order: number;
  team: number | null;
  board_x: number | null;
  board_y: number | null;
  created_at: string;
  updated_at: string;
  is_ringer: boolean;
  guest_name: string | null;
  added_by: string | null;
}

export interface BoardPosition {
  x: number;
  y: number;
}

export interface PlayerRating {
  id: string;
  player_game_id: string;
  rating: number;
  rated_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerGameWithProfile extends PlayerGame {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  average_rating?: number;
  rating_count?: number;
}

export interface GameWithPlayers extends Game {
  player_games: PlayerGameWithProfile[];
  player_count: number;
  user_signed_up: boolean;
  invitation_id?: string;
  invitation_status?: 'pending' | 'accepted';
}

export interface SavedRinger {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface GameInvitation {
  id: string;
  game_id: string;
  invited_by: string;
  invited_user_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  updated_at: string;
}
