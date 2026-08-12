export interface Game {
  id: string;
  kickoff_date: string;
  visible_at: string;
  created_at: string;
  updated_at: string;
  team1_name: string;
  team2_name: string;
  players_per_team: number;
}

export interface PlayerGame {
  id: string;
  game_id: string;
  user_id: string;
  signup_order: number;
  team: number | null;
  board_x: number | null;
  board_y: number | null;
  created_at: string;
  updated_at: string;
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
  };
  average_rating?: number;
  rating_count?: number;
}

export interface GameWithPlayers extends Game {
  player_games: PlayerGameWithProfile[];
  player_count: number;
  user_signed_up: boolean;
}
