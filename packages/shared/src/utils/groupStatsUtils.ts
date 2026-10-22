import {
  GroupAward,
  GroupStats,
  GroupStatsAppearance,
  GroupStatsSummary,
  PartnerSummary,
  PartnershipStats,
  PlayerResult,
  PlayerStats,
  ResultRecord,
  RivalryStats,
  StatsPlayer,
  Streak,
} from '../types/groupStats';

export const MIN_PAIR_GAMES = 3;
export const MIN_LEADERBOARD_GAMES = 3;
const FORM_LENGTH = 5;
const MAX_AWARD_WINNERS = 3;
const TOP_PAIRS = 5;
const TOP_RIVALRIES = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type GroupStatsRange = 'all' | '90d' | '365d';

export const GROUP_STATS_RANGES: { value: GroupStatsRange; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '365d', label: 'Last 12 months' },
  { value: '90d', label: 'Last 3 months' },
];

const RANGE_DAYS: Record<Exclude<GroupStatsRange, 'all'>, number> = {
  '90d': 90,
  '365d': 365,
};

export const parseGroupStatsRange = (value: string | null | undefined): GroupStatsRange =>
  GROUP_STATS_RANGES.some((range) => range.value === value) ? (value as GroupStatsRange) : 'all';

export const filterAppearancesByRange = (
  appearances: GroupStatsAppearance[],
  range: GroupStatsRange,
  now: Date = new Date()
): GroupStatsAppearance[] => {
  if (range === 'all') return appearances;
  const since = now.getTime() - RANGE_DAYS[range] * MS_PER_DAY;
  return appearances.filter((a) => new Date(a.kickoff_date).getTime() >= since);
};

interface GameResult {
  team1: number | null;
  team2: number | null;
  winningTeam: 1 | 2 | null;
  hasResult: boolean;
}

const getGameResult = (a: GroupStatsAppearance): GameResult => {
  const { result_team1_score: team1, result_team2_score: team2, result_outcome: outcome } = a;
  if (team1 !== null && team2 !== null) {
    return {
      team1,
      team2,
      winningTeam: team1 > team2 ? 1 : team2 > team1 ? 2 : null,
      hasResult: true,
    };
  }
  if (outcome) {
    return {
      team1: null,
      team2: null,
      winningTeam: outcome === 'team1_win' ? 1 : outcome === 'team2_win' ? 2 : null,
      hasResult: true,
    };
  }
  return { team1: null, team2: null, winningTeam: null, hasResult: false };
};

export const getPlayerResult = (a: GroupStatsAppearance): PlayerResult | null => {
  const result = getGameResult(a);
  if (!result.hasResult) return null;
  if (result.winningTeam === null) return 'draw';
  return result.winningTeam === a.team ? 'win' : 'loss';
};

export const getPlayerGoalDifference = (a: GroupStatsAppearance): number | null => {
  const { team1, team2 } = getGameResult(a);
  if (team1 === null || team2 === null) return null;
  return a.team === 1 ? team1 - team2 : team2 - team1;
};

class RecordBuilder {
  wins = 0;
  draws = 0;
  losses = 0;
  games = 0;
  goalDifference = 0;
  scoredGames = 0;

  add(result: PlayerResult | null, goalDifference: number | null) {
    this.games += 1;
    if (result === 'win') this.wins += 1;
    if (result === 'draw') this.draws += 1;
    if (result === 'loss') this.losses += 1;
    if (goalDifference !== null) {
      this.goalDifference += goalDifference;
      this.scoredGames += 1;
    }
  }

  build(): ResultRecord {
    const resultGames = this.wins + this.draws + this.losses;
    return {
      games: this.games,
      wins: this.wins,
      draws: this.draws,
      losses: this.losses,
      winRate: resultGames > 0 ? this.wins / resultGames : null,
      goalDifference: this.goalDifference,
      scoredGames: this.scoredGames,
      averageGoalDifference: this.scoredGames > 0 ? this.goalDifference / this.scoredGames : null,
    };
  }
}

const toPlayer = (a: GroupStatsAppearance): StatsPlayer => ({
  userId: a.user_id,
  name: a.display_name || a.username,
  avatarUrl: a.avatar_url,
});

const toRating = (a: GroupStatsAppearance): number | null =>
  a.rating_count > 0 && a.average_rating !== null ? Number(a.average_rating) : null;

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const resultGamesOf = (record: ResultRecord) => record.wins + record.draws + record.losses;

const nullsLast = (a: number | null, b: number | null) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
};

const compareRecordsBestFirst = (a: ResultRecord, b: ResultRecord) =>
  nullsLast(a.winRate, b.winRate) ||
  nullsLast(a.averageGoalDifference, b.averageGoalDifference) ||
  b.games - a.games;

const compareRecordsWorstFirst = (a: ResultRecord, b: ResultRecord) =>
  nullsLast(a.winRate === null ? null : -a.winRate, b.winRate === null ? null : -b.winRate) ||
  nullsLast(
    a.averageGoalDifference === null ? null : -a.averageGoalDifference,
    b.averageGoalDifference === null ? null : -b.averageGoalDifference
  ) ||
  b.games - a.games;

const getStreaks = (results: PlayerResult[]) => {
  let currentStreak = null as Streak | null;
  let longestWinStreak = 0;
  let longestUnbeatenStreak = 0;
  let winRun = 0;
  let unbeatenRun = 0;

  for (const result of results) {
    winRun = result === 'win' ? winRun + 1 : 0;
    unbeatenRun = result === 'loss' ? 0 : unbeatenRun + 1;
    longestWinStreak = Math.max(longestWinStreak, winRun);
    longestUnbeatenStreak = Math.max(longestUnbeatenStreak, unbeatenRun);
    currentStreak =
      currentStreak?.result === result
        ? { result, length: currentStreak.length + 1 }
        : { result, length: 1 };
  }

  return { currentStreak, longestWinStreak, longestUnbeatenStreak };
};

const groupByGame = (appearances: GroupStatsAppearance[]) => {
  const games = new Map<string, GroupStatsAppearance[]>();
  for (const a of appearances) {
    const rows = games.get(a.game_id) ?? [];
    rows.push(a);
    games.set(a.game_id, rows);
  }
  return games;
};

const getMostGamesPlayed = (players: PlayerStats[]): GroupStatsSummary['mostGamesPlayed'] => {
  if (players.length === 0) return null;
  const games = Math.max(...players.map((p) => p.appearances));
  return { games, players: players.filter((p) => p.appearances === games).map((p) => p.player) };
};

const buildSummary = (
  games: Map<string, GroupStatsAppearance[]>,
  players: PlayerStats[]
): GroupStatsSummary => {
  let gamesWithResult = 0;
  let draws = 0;
  let totalGoals = 0;
  let scoredGames = 0;
  let biggestWin: GroupStatsSummary['biggestWin'] = null;

  for (const [gameId, rows] of games) {
    const result = getGameResult(rows[0]);
    if (!result.hasResult) continue;
    gamesWithResult += 1;
    if (result.winningTeam === null) draws += 1;
    if (result.team1 === null || result.team2 === null) continue;

    scoredGames += 1;
    totalGoals += result.team1 + result.team2;
    const winnerScore = Math.max(result.team1, result.team2);
    const loserScore = Math.min(result.team1, result.team2);
    const margin = winnerScore - loserScore;
    if (margin > 0 && (!biggestWin || margin > biggestWin.winnerScore - biggestWin.loserScore)) {
      biggestWin = {
        gameId,
        kickoffDate: rows[0].kickoff_date,
        winnerScore,
        loserScore,
      };
    }
  }

  return {
    gamesPlayed: games.size,
    gamesWithResult,
    playerCount: players.length,
    mostGamesPlayed: getMostGamesPlayed(players),
    totalGoals,
    averageGoalsPerGame: scoredGames > 0 ? totalGoals / scoredGames : null,
    drawRate: gamesWithResult > 0 ? draws / gamesWithResult : null,
    biggestWin,
  };
};

const percent = (rate: number) => `${Math.round(rate * 100)}%`;
export const formatRecord = (r: ResultRecord) => `W${r.wins} D${r.draws} L${r.losses}`;

export const formatWinRate = (rate: number | null): string => (rate === null ? '–' : percent(rate));

export const formatGoalDifference = (value: number | null, decimals = 0): string => {
  if (value === null) return '–';
  const rounded = Number(value.toFixed(decimals));
  if (rounded === 0) return (0).toFixed(decimals);
  return rounded > 0 ? `+${rounded.toFixed(decimals)}` : rounded.toFixed(decimals);
};

export const formatPlayerNames = (players: StatsPlayer[], maxNames = 3): string =>
  players.length > maxNames
    ? `${players.length} players tied`
    : players.map((p) => p.name).join(', ');

export const formatRating = (value: number | null): string =>
  value === null ? '–' : value.toFixed(1);

const topBy = <T>(items: T[], score: (item: T) => number | null) => {
  let best: number | null = null;
  for (const item of items) {
    const value = score(item);
    if (value !== null && value > 0 && (best === null || value > best)) best = value;
  }
  return best === null ? null : { value: best, items: items.filter((i) => score(i) === best) };
};

const buildAwards = (
  players: PlayerStats[],
  bestPartnerships: PartnershipStats[],
  rivalries: RivalryStats[]
): GroupAward[] => {
  const awards: GroupAward[] = [];
  const names = (list: PlayerStats[]) => list.map((p) => p.player.name);
  const qualified = players.filter((p) => resultGamesOf(p.record) >= MIN_LEADERBOARD_GAMES);

  const winner = topBy(qualified, (p) => p.record.winRate);
  if (winner) {
    awards.push({
      key: 'serial_winner',
      title: 'Serial Winner',
      description: `Best win rate (min ${MIN_LEADERBOARD_GAMES} results)`,
      winners: names(winner.items),
      detail: percent(winner.value),
    });
  }

  const rated = players.filter((p) => p.ratedGames >= MIN_LEADERBOARD_GAMES);
  const topRated = topBy(rated, (p) => p.averageRating);
  if (topRated) {
    awards.push({
      key: 'fan_favourite',
      title: 'Fan Favourite',
      description: `Highest average rating (min ${MIN_LEADERBOARD_GAMES} rated games)`,
      winners: names(topRated.items),
      detail: `${formatRating(topRated.value)} / 10`,
    });
  }

  const potm = topBy(players, (p) => p.playerOfTheMatch);
  if (potm) {
    awards.push({
      key: 'player_of_the_match',
      title: 'Main Character',
      description: 'Most player-of-the-match ratings',
      winners: names(potm.items),
      detail: `${potm.value}×`,
    });
  }

  const onFire = topBy(players, (p) =>
    p.currentStreak?.result === 'win' && p.currentStreak.length >= 2 ? p.currentStreak.length : null
  );
  if (onFire) {
    awards.push({
      key: 'on_fire',
      title: 'On Fire',
      description: 'Longest current winning run',
      winners: names(onFire.items),
      detail: `${onFire.value} wins in a row`,
    });
  }

  const unbeaten = topBy(players, (p) =>
    p.longestUnbeatenStreak >= 3 ? p.longestUnbeatenStreak : null
  );
  if (unbeaten) {
    awards.push({
      key: 'unbeatable',
      title: 'Unbeatable',
      description: 'Longest unbeaten run',
      winners: names(unbeaten.items),
      detail: `${unbeaten.value} games`,
    });
  }

  const goalMachine = topBy(
    players.filter((p) => p.record.scoredGames >= MIN_LEADERBOARD_GAMES),
    (p) => p.record.averageGoalDifference
  );
  if (goalMachine) {
    awards.push({
      key: 'difference_maker',
      title: 'Difference Maker',
      description: `Best average goal difference (min ${MIN_LEADERBOARD_GAMES} scored games)`,
      winners: names(goalMachine.items),
      detail: `${formatGoalDifference(goalMachine.value, 1)} per game`,
    });
  }

  const dreamTeam = bestPartnerships[0];
  if (dreamTeam && (dreamTeam.record.winRate ?? 0) > 0) {
    awards.push({
      key: 'dream_team',
      title: 'Dream Team',
      description: 'Best partnership',
      winners: [`${dreamTeam.players[0].name} & ${dreamTeam.players[1].name}`],
      detail: `${formatRecord(dreamTeam.record)} together`,
    });
  }

  const rivalry = rivalries[0];
  if (rivalry) {
    awards.push({
      key: 'fiercest_rivalry',
      title: 'Fiercest Rivalry',
      description: 'Most games on opposite sides',
      winners: [`${rivalry.players[0].name} vs ${rivalry.players[1].name}`],
      detail: `${rivalry.wins[0]}–${rivalry.draws}–${rivalry.wins[1]} in ${rivalry.games} games`,
    });
  }

  return awards.filter((award) => award.winners.length <= MAX_AWARD_WINNERS);
};

export const computeGroupStats = (appearances: GroupStatsAppearance[]): GroupStats => {
  const sorted = [...appearances].sort(
    (a, b) => new Date(a.kickoff_date).getTime() - new Date(b.kickoff_date).getTime()
  );
  const games = groupByGame(sorted);

  const playersById = new Map<string, StatsPlayer>();
  const recordBuilders = new Map<string, RecordBuilder>();
  const resultsById = new Map<string, PlayerResult[]>();
  const ratingsById = new Map<string, number[]>();
  const potmById = new Map<string, number>();
  const pairBuilders = new Map<
    string,
    { players: [StatsPlayer, StatsPlayer]; builder: RecordBuilder }
  >();
  const rivalryBuilders = new Map<string, RivalryStats>();

  for (const a of sorted) {
    playersById.set(a.user_id, toPlayer(a));
    const result = getPlayerResult(a);
    const builder = recordBuilders.get(a.user_id) ?? new RecordBuilder();
    builder.add(result, getPlayerGoalDifference(a));
    recordBuilders.set(a.user_id, builder);
    if (result) resultsById.set(a.user_id, [...(resultsById.get(a.user_id) ?? []), result]);
    const rating = toRating(a);
    if (rating !== null)
      ratingsById.set(a.user_id, [...(ratingsById.get(a.user_id) ?? []), rating]);
  }

  for (const rows of games.values()) {
    const ratings = rows.map(toRating).filter((r): r is number => r !== null);
    if (ratings.length > 0) {
      const top = Math.max(...ratings);
      for (const row of rows) {
        if (toRating(row) === top) potmById.set(row.user_id, (potmById.get(row.user_id) ?? 0) + 1);
      }
    }

    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const [first, second] =
          rows[i].user_id < rows[j].user_id ? [rows[i], rows[j]] : [rows[j], rows[i]];
        const key = pairKey(first.user_id, second.user_id);

        if (first.team === second.team) {
          const pair = pairBuilders.get(key) ?? {
            players: [toPlayer(first), toPlayer(second)] as [StatsPlayer, StatsPlayer],
            builder: new RecordBuilder(),
          };
          pair.builder.add(getPlayerResult(first), getPlayerGoalDifference(first));
          pairBuilders.set(key, pair);
          continue;
        }

        const result = getPlayerResult(first);
        if (!result) continue;
        const rivalry = rivalryBuilders.get(key) ?? {
          players: [toPlayer(first), toPlayer(second)] as [StatsPlayer, StatsPlayer],
          games: 0,
          wins: [0, 0] as [number, number],
          draws: 0,
        };
        rivalry.games += 1;
        if (result === 'win') rivalry.wins[0] += 1;
        if (result === 'loss') rivalry.wins[1] += 1;
        if (result === 'draw') rivalry.draws += 1;
        rivalryBuilders.set(key, rivalry);
      }
    }
  }

  const partnerships: PartnershipStats[] = [...pairBuilders.values()].map(
    ({ players, builder }) => ({
      players,
      record: builder.build(),
    })
  );
  const qualifiedPartnerships = partnerships.filter(
    (p) => resultGamesOf(p.record) >= MIN_PAIR_GAMES
  );
  const rivalries = [...rivalryBuilders.values()];

  const partnerSummaries = (userId: string): PartnerSummary[] =>
    qualifiedPartnerships
      .filter((p) => p.players.some((pl) => pl.userId === userId))
      .map((p) => ({
        partner: p.players[0].userId === userId ? p.players[1] : p.players[0],
        record: p.record,
      }));

  const nemesisFor = (userId: string): PartnerSummary | null => {
    const records = rivalries
      .filter((r) => r.games >= MIN_PAIR_GAMES && r.players.some((pl) => pl.userId === userId))
      .map((r) => {
        const isFirst = r.players[0].userId === userId;
        const wins = r.wins[isFirst ? 0 : 1];
        const losses = r.wins[isFirst ? 1 : 0];
        const record: ResultRecord = {
          games: r.games,
          wins,
          draws: r.draws,
          losses,
          winRate: wins / r.games,
          goalDifference: 0,
          scoredGames: 0,
          averageGoalDifference: null,
        };
        return { partner: r.players[isFirst ? 1 : 0], record };
      })
      .filter((s) => s.record.losses > s.record.wins)
      .sort((a, b) => compareRecordsWorstFirst(a.record, b.record));
    return records[0] ?? null;
  };

  const players: PlayerStats[] = [...playersById.values()].map((player) => {
    const record = recordBuilders.get(player.userId)!.build();
    const results = resultsById.get(player.userId) ?? [];
    const ratings = ratingsById.get(player.userId) ?? [];
    const partners = partnerSummaries(player.userId);
    const best =
      [...partners].sort((a, b) => compareRecordsBestFirst(a.record, b.record))[0] ?? null;
    const worst =
      partners.length > 1
        ? [...partners].sort((a, b) => compareRecordsWorstFirst(a.record, b.record))[0]
        : null;
    const resultGames = resultGamesOf(record);

    return {
      player,
      appearances: record.games,
      record,
      pointsPerGame: resultGames > 0 ? (record.wins * 3 + record.draws) / resultGames : null,
      averageRating:
        ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null,
      ratedGames: ratings.length,
      playerOfTheMatch: potmById.get(player.userId) ?? 0,
      form: results.slice(-FORM_LENGTH),
      ...getStreaks(results),
      bestPartner: best,
      worstPartner: worst && worst.partner.userId !== best?.partner.userId ? worst : null,
      nemesis: nemesisFor(player.userId),
    };
  });

  players.sort(
    (a, b) =>
      b.appearances - a.appearances ||
      nullsLast(a.record.winRate, b.record.winRate) ||
      a.player.name.localeCompare(b.player.name)
  );

  const isWinningPartnership = (p: PartnershipStats) => (p.record.winRate ?? 0) >= 0.5;
  const bestPartnerships = qualifiedPartnerships
    .filter(isWinningPartnership)
    .sort((a, b) => compareRecordsBestFirst(a.record, b.record))
    .slice(0, TOP_PAIRS);
  const worstPartnerships = qualifiedPartnerships
    .filter((p) => p.record.winRate !== null && !isWinningPartnership(p))
    .sort((a, b) => compareRecordsWorstFirst(a.record, b.record))
    .slice(0, TOP_PAIRS);
  const topRivalries = rivalries
    .filter((r) => r.games >= MIN_PAIR_GAMES)
    .sort(
      (a, b) =>
        b.games - a.games || Math.abs(a.wins[0] - a.wins[1]) - Math.abs(b.wins[0] - b.wins[1])
    )
    .slice(0, TOP_RIVALRIES);

  return {
    summary: buildSummary(games, players),
    players,
    bestPartnerships,
    worstPartnerships,
    rivalries: topRivalries,
    awards: buildAwards(players, bestPartnerships, topRivalries),
  };
};

export type PlayerStatsSortKey =
  | 'appearances'
  | 'winRate'
  | 'pointsPerGame'
  | 'goalDifference'
  | 'averageRating'
  | 'playerOfTheMatch';

export const PLAYER_STATS_SORT_OPTIONS: {
  value: PlayerStatsSortKey;
  label: string;
}[] = [
  { value: 'appearances', label: 'Games' },
  { value: 'winRate', label: 'Win %' },
  { value: 'pointsPerGame', label: 'Pts/game' },
  { value: 'goalDifference', label: 'Avg GD' },
  { value: 'averageRating', label: 'Rating' },
  { value: 'playerOfTheMatch', label: 'POTM' },
];

const sortValue = (p: PlayerStats, key: PlayerStatsSortKey): number | null => {
  switch (key) {
    case 'appearances':
      return p.appearances;
    case 'winRate':
      return p.record.winRate;
    case 'pointsPerGame':
      return p.pointsPerGame;
    case 'goalDifference':
      return p.record.averageGoalDifference;
    case 'averageRating':
      return p.averageRating;
    case 'playerOfTheMatch':
      return p.playerOfTheMatch;
  }
};

export type SortDirection = 'asc' | 'desc';

export const sortPlayerStats = (
  players: PlayerStats[],
  key: PlayerStatsSortKey,
  direction: SortDirection = 'desc'
): PlayerStats[] => {
  const sign = direction === 'desc' ? 1 : -1;
  const signed = (value: number | null) => (value === null ? null : sign * value);
  return [...players].sort(
    (a, b) =>
      nullsLast(signed(sortValue(a, key)), signed(sortValue(b, key))) ||
      nullsLast(signed(a.pointsPerGame), signed(b.pointsPerGame)) ||
      sign * (b.appearances - a.appearances) ||
      a.player.name.localeCompare(b.player.name)
  );
};

const STREAK_NOUNS: Record<PlayerResult, [string, string]> = {
  win: ['win', 'wins'],
  draw: ['draw', 'draws'],
  loss: ['loss', 'losses'],
};

export const formatStreak = (streak: Streak | null): string =>
  streak ? `${streak.length} ${STREAK_NOUNS[streak.result][streak.length === 1 ? 0 : 1]}` : '–';
