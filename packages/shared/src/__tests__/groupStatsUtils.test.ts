import {
  computeGroupStats,
  filterAppearancesByRange,
  formatGoalDifference,
  formatPlayerNames,
  formatStreak,
  getPlayerGoalDifference,
  getPlayerResult,
  parseGroupStatsRange,
  sortPlayerStats,
} from '../utils/groupStatsUtils';
import { GroupStatsAppearance } from '../types/groupStats';
import { GameOutcome } from '../types/game';

interface GameSpec {
  id: string;
  daysAgo: number;
  team1: string[];
  team2?: string[];
  score?: [number, number];
  outcome?: GameOutcome;
  ratings?: Record<string, number>;
  singleTeam?: boolean;
}

const NOW = new Date('2026-10-22T12:00:00.000Z');

function appearancesFor(spec: GameSpec): GroupStatsAppearance[] {
  const kickoff = new Date(NOW.getTime() - spec.daysAgo * 24 * 60 * 60 * 1000).toISOString();
  const row = (userId: string, team: number): GroupStatsAppearance => ({
    game_id: spec.id,
    kickoff_date: kickoff,
    single_team: spec.singleTeam ?? false,
    result_team1_score: spec.score?.[0] ?? null,
    result_team2_score: spec.score?.[1] ?? null,
    result_outcome: spec.outcome ?? null,
    user_id: userId,
    username: userId,
    display_name: userId.toUpperCase(),
    avatar_url: null,
    team,
    average_rating: spec.ratings?.[userId] !== undefined ? String(spec.ratings[userId]) : null,
    rating_count: spec.ratings?.[userId] !== undefined ? 2 : 0,
  });
  return [...spec.team1.map((u) => row(u, 1)), ...(spec.team2 ?? []).map((u) => row(u, 2))];
}

const build = (...specs: GameSpec[]) => specs.flatMap(appearancesFor);
const playerStats = (stats: ReturnType<typeof computeGroupStats>, userId: string) =>
  stats.players.find((p) => p.player.userId === userId)!;

describe('getPlayerResult / getPlayerGoalDifference', () => {
  const [team1Row, team2Row] = build({
    id: 'g',
    daysAgo: 1,
    team1: ['a'],
    team2: ['b'],
    score: [3, 1],
  });

  it('reads a scoreline from each side', () => {
    expect(getPlayerResult(team1Row)).toBe('win');
    expect(getPlayerResult(team2Row)).toBe('loss');
    expect(getPlayerGoalDifference(team1Row)).toBe(2);
    expect(getPlayerGoalDifference(team2Row)).toBe(-2);
  });

  it('reads an outcome-only result with no goal difference', () => {
    const [row] = build({ id: 'g', daysAgo: 1, team1: ['a'], outcome: 'draw' });
    expect(getPlayerResult(row)).toBe('draw');
    expect(getPlayerGoalDifference(row)).toBeNull();
  });

  it('returns null when no result was entered', () => {
    const [row] = build({ id: 'g', daysAgo: 1, team1: ['a'] });
    expect(getPlayerResult(row)).toBeNull();
  });
});

describe('computeGroupStats', () => {
  const appearances = build(
    {
      id: 'g1',
      daysAgo: 40,
      team1: ['a', 'b'],
      team2: ['c', 'd'],
      score: [5, 1],
      ratings: { a: 9, c: 6 },
    },
    {
      id: 'g2',
      daysAgo: 30,
      team1: ['a', 'b'],
      team2: ['c', 'd'],
      score: [2, 2],
      ratings: { b: 8 },
    },
    {
      id: 'g3',
      daysAgo: 20,
      team1: ['a', 'b'],
      team2: ['c', 'd'],
      outcome: 'team1_win',
    },
    {
      id: 'g4',
      daysAgo: 10,
      team1: ['a', 'c'],
      team2: ['b', 'd'],
      score: [3, 0],
      ratings: { a: 7, d: 7 },
    },
    { id: 'g5', daysAgo: 5, team1: ['a', 'd'], team2: ['b', 'c'] }
  );
  const stats = computeGroupStats(appearances);

  it('builds per-player records, goal difference and points per game', () => {
    const a = playerStats(stats, 'a');
    expect(a.appearances).toBe(5);
    expect(a.record).toMatchObject({
      wins: 3,
      draws: 1,
      losses: 0,
      goalDifference: 7,
      scoredGames: 3,
    });
    expect(a.record.winRate).toBe(0.75);
    expect(a.record.averageGoalDifference).toBeCloseTo(7 / 3);
    expect(a.pointsPerGame).toBe(10 / 4);
  });

  it('averages per-game ratings and counts player-of-the-match including ties', () => {
    const a = playerStats(stats, 'a');
    expect(a.averageRating).toBe(8);
    expect(a.ratedGames).toBe(2);
    expect(a.playerOfTheMatch).toBe(2);
    expect(playerStats(stats, 'd').playerOfTheMatch).toBe(1);
    expect(playerStats(stats, 'c').averageRating).toBe(6);
  });

  it('tracks form and streaks over games with a result, oldest first', () => {
    const d = playerStats(stats, 'd');
    expect(d.form).toEqual(['loss', 'draw', 'loss', 'loss']);
    expect(d.currentStreak).toEqual({ result: 'loss', length: 2 });
    expect(d.longestWinStreak).toBe(0);
    expect(playerStats(stats, 'a').longestUnbeatenStreak).toBe(4);
  });

  it('ranks partnerships with enough games together', () => {
    expect(stats.bestPartnerships[0].players.map((p) => p.userId)).toEqual(['a', 'b']);
    expect(stats.bestPartnerships[0].record).toMatchObject({
      wins: 2,
      draws: 1,
      losses: 0,
    });
    expect(stats.worstPartnerships[0].players.map((p) => p.userId)).toEqual(['c', 'd']);
    expect(playerStats(stats, 'a').bestPartner?.partner.userId).toBe('b');
  });

  it('finds rivalries and each player’s nemesis', () => {
    const ac = stats.rivalries.find(
      (r) => r.players[0].userId === 'a' && r.players[1].userId === 'c'
    );
    expect(ac).toMatchObject({ games: 3, wins: [2, 0], draws: 1 });
    expect(playerStats(stats, 'c').nemesis?.partner.userId).toBe('a');
    expect(playerStats(stats, 'a').nemesis).toBeNull();
  });

  it('summarises the group', () => {
    expect(stats.summary).toMatchObject({
      gamesPlayed: 5,
      gamesWithResult: 4,
      playerCount: 4,
      totalGoals: 13,
      drawRate: 0.25,
      biggestWin: { gameId: 'g1', winnerScore: 5, loserScore: 1 },
    });
    expect(stats.summary.averageGoalsPerGame).toBeCloseTo(13 / 3);
    expect(stats.summary.gamesWithoutResult).toEqual([
      { gameId: 'g5', kickoffDate: expect.any(String) },
    ]);
    expect(stats.summary.mostGamesPlayed?.games).toBe(5);
    expect(stats.summary.mostGamesPlayed?.players.map((p) => p.userId)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('hands out awards', () => {
    const award = (key: string) => stats.awards.find((a) => a.key === key);
    expect(award('serial_winner')?.winners).toEqual(['A']);
    expect(award('dream_team')?.winners).toEqual(['A & B']);
    expect(award('player_of_the_match')?.winners).toEqual(['A']);
  });

  it('has no rivalries for single-team games', () => {
    const single = computeGroupStats(
      build(
        {
          id: 's1',
          daysAgo: 3,
          team1: ['a', 'b'],
          score: [1, 0],
          singleTeam: true,
        },
        {
          id: 's2',
          daysAgo: 2,
          team1: ['a', 'b'],
          score: [0, 2],
          singleTeam: true,
        },
        {
          id: 's3',
          daysAgo: 1,
          team1: ['a', 'b'],
          score: [1, 1],
          singleTeam: true,
        }
      )
    );
    expect(single.rivalries).toEqual([]);
    expect(single.worstPartnerships[0].record).toMatchObject({
      wins: 1,
      draws: 1,
      losses: 1,
      goalDifference: -1,
    });
  });

  it('lists games still missing a result, newest first', () => {
    const missing = computeGroupStats(
      build(
        { id: 'old', daysAgo: 9, team1: ['a'], team2: ['b'] },
        { id: 'scored', daysAgo: 5, team1: ['a'], team2: ['b'], score: [1, 0] },
        { id: 'new', daysAgo: 2, team1: ['a'], team2: ['b'] }
      )
    );
    expect(missing.summary.gamesWithoutResult.map((g) => g.gameId)).toEqual(['new', 'old']);
  });

  it('handles no games', () => {
    const empty = computeGroupStats([]);
    expect(empty.players).toEqual([]);
    expect(empty.summary.gamesPlayed).toBe(0);
    expect(empty.awards).toEqual([]);
  });
});

describe('sortPlayerStats', () => {
  it('sorts either direction, always with nulls last', () => {
    const stats = computeGroupStats(
      build(
        { id: 'g1', daysAgo: 2, team1: ['a'], team2: ['b'], score: [1, 0] },
        { id: 'g2', daysAgo: 1, team1: ['a', 'c'], team2: ['b'] }
      )
    );
    expect(stats.summary.mostGamesPlayed).toEqual({
      games: 2,
      players: [expect.objectContaining({ userId: 'a' }), expect.objectContaining({ userId: 'b' })],
    });
    expect(sortPlayerStats(stats.players, 'winRate').map((p) => p.player.userId)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(sortPlayerStats(stats.players, 'winRate', 'asc').map((p) => p.player.userId)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });
});

describe('ranges and formatting', () => {
  it('filters appearances by range', () => {
    const rows = build(
      { id: 'old', daysAgo: 200, team1: ['a'] },
      { id: 'new', daysAgo: 10, team1: ['a'] }
    );
    expect(filterAppearancesByRange(rows, '90d', NOW).map((r) => r.game_id)).toEqual(['new']);
    expect(filterAppearancesByRange(rows, '365d', NOW)).toHaveLength(2);
    expect(filterAppearancesByRange(rows, 'all', NOW)).toHaveLength(2);
  });

  it('parses unknown ranges as all time', () => {
    expect(parseGroupStatsRange('90d')).toBe('90d');
    expect(parseGroupStatsRange('nope')).toBe('all');
    expect(parseGroupStatsRange(undefined)).toBe('all');
  });

  it('formats goal difference with a sign', () => {
    expect(formatGoalDifference(2)).toBe('+2');
    expect(formatGoalDifference(-1.25, 1)).toBe('-1.3');
    expect(formatGoalDifference(-0.01, 1)).toBe('0.0');
    expect(formatGoalDifference(null)).toBe('–');
  });
});

describe('formatPlayerNames', () => {
  const player = (name: string) => ({ userId: name, name, avatarUrl: null });

  it('lists a few names, and counts a big tie instead', () => {
    expect(formatPlayerNames([player('Ann'), player('Bo')])).toBe('Ann, Bo');
    expect(formatPlayerNames(['A', 'B', 'C', 'D'].map(player))).toBe('4 players tied');
  });
});

describe('formatStreak', () => {
  it('pluralises the result', () => {
    expect(formatStreak({ result: 'loss', length: 2 })).toBe('2 losses');
    expect(formatStreak({ result: 'win', length: 1 })).toBe('1 win');
    expect(formatStreak(null)).toBe('–');
  });
});
