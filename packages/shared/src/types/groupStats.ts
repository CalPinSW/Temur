import { GameOutcome } from './game';

// One row from get_group_stats_appearances: a player who was on a team in a
// played (past, non-deleted) group game.
export interface GroupStatsAppearance {
  game_id: string;
  kickoff_date: string;
  single_team: boolean;
  result_team1_score: number | null;
  result_team2_score: number | null;
  result_outcome: GameOutcome | null;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  team: number;
  average_rating: number | string | null;
  rating_count: number;
}

export type PlayerResult = 'win' | 'draw' | 'loss';

export interface StatsPlayer {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface ResultRecord {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  // Wins over games with a result; null when none had one.
  winRate: number | null;
  goalDifference: number;
  // Games with an actual scoreline — outcome-only results carry no goals.
  scoredGames: number;
  averageGoalDifference: number | null;
}

export interface Streak {
  result: PlayerResult;
  length: number;
}

export interface PartnerSummary {
  partner: StatsPlayer;
  record: ResultRecord;
}

export interface PlayerStats {
  player: StatsPlayer;
  appearances: number;
  record: ResultRecord;
  pointsPerGame: number | null;
  averageRating: number | null;
  ratedGames: number;
  // Games where this player had the highest average rating (ties all count).
  playerOfTheMatch: number;
  // Up to the last five results, oldest first.
  form: PlayerResult[];
  currentStreak: Streak | null;
  longestWinStreak: number;
  longestUnbeatenStreak: number;
  bestPartner: PartnerSummary | null;
  worstPartner: PartnerSummary | null;
  nemesis: PartnerSummary | null;
}

export interface PartnershipStats {
  players: [StatsPlayer, StatsPlayer];
  record: ResultRecord;
}

export interface RivalryStats {
  players: [StatsPlayer, StatsPlayer];
  games: number;
  // Wins for players[0] and players[1] respectively.
  wins: [number, number];
  draws: number;
}

export interface GroupStatsSummary {
  gamesPlayed: number;
  gamesWithResult: number;
  // Played games nobody has entered a result for yet, newest first.
  gamesWithoutResult: { gameId: string; kickoffDate: string }[];
  playerCount: number;
  // Everyone tied on the most appearances.
  mostGamesPlayed: {
    players: StatsPlayer[];
    games: number;
  } | null;
  totalGoals: number;
  averageGoalsPerGame: number | null;
  drawRate: number | null;
  biggestWin: {
    gameId: string;
    kickoffDate: string;
    winnerScore: number;
    loserScore: number;
  } | null;
}

export interface GroupAward {
  key: string;
  title: string;
  description: string;
  winners: string[];
  detail: string;
}

export interface GroupStats {
  summary: GroupStatsSummary;
  players: PlayerStats[];
  bestPartnerships: PartnershipStats[];
  worstPartnerships: PartnershipStats[];
  rivalries: RivalryStats[];
  awards: GroupAward[];
}
