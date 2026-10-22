import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedCard, ThemedTextBox } from '@/components/themed';
import { useGroupStats } from '@/hooks/useGroupStats';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import {
  GROUP_STATS_RANGES,
  PLAYER_STATS_SORT_OPTIONS,
  computeGroupStats,
  filterAppearancesByRange,
  formatDate,
  formatGoalDifference,
  formatPlayerNames,
  formatRating,
  formatRecord,
  formatStreak,
  formatWinRate,
  sortPlayerStats,
  type GroupStatsRange,
  type PartnerSummary,
  type PartnershipStats,
  type PlayerResult,
  type PlayerStats,
  type PlayerStatsSortKey,
} from '@temur/shared';

interface GroupStatsScreenProps {
  groupId: string;
  onGoBack: () => void;
  onNavigateToGame: (gameId: string) => void;
}

const RESULT_LABEL: Record<PlayerResult, string> = { win: 'W', draw: 'D', loss: 'L' };

function FormBadges({ form }: { form: PlayerResult[] }) {
  const { colors } = useTheme();
  const background: Record<PlayerResult, string> = {
    win: colors.success,
    draw: colors.textTertiary,
    loss: colors.error,
  };
  return (
    <View style={styles.formRow}>
      {form.map((result, index) => (
        <View key={index} style={[styles.formBadge, { backgroundColor: background[result] }]}>
          <ThemedTextBox variant="caption" weight="bold" style={styles.formBadgeText}>
            {RESULT_LABEL[result]}
          </ThemedTextBox>
        </View>
      ))}
    </View>
  );
}

function SummaryTile({
  label,
  value,
  detail,
  fullWidth = false,
}: {
  label: string;
  value: string;
  detail?: string;
  fullWidth?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.summaryTile,
        fullWidth && styles.summaryTileFull,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <ThemedTextBox variant="caption" color="secondary">
        {label}
      </ThemedTextBox>
      <ThemedTextBox variant="heading" weight="semibold">
        {value}
      </ThemedTextBox>
      {detail && (
        <ThemedTextBox variant="caption" color="secondary">
          {detail}
        </ThemedTextBox>
      )}
    </View>
  );
}

function PartnerLine({ label, summary }: { label: string; summary: PartnerSummary | null }) {
  if (!summary) return null;
  const gd = summary.record.averageGoalDifference;
  return (
    <ThemedTextBox variant="caption" color="secondary">
      {`${label}: ${summary.partner.name} (${formatRecord(summary.record)}${
        gd !== null ? `, ${formatGoalDifference(gd, 1)} GD/game` : ''
      })`}
    </ThemedTextBox>
  );
}

function PlayerRow({
  stats,
  expanded,
  onToggle,
}: {
  stats: PlayerStats;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      style={[styles.playerRow, { borderColor: colors.border }]}
    >
      <View style={styles.playerRowHeader}>
        <View style={styles.playerName}>
          <ThemedTextBox variant="body" weight="semibold">
            {stats.player.name}
          </ThemedTextBox>
          <ThemedTextBox variant="caption" color="secondary">
            {`${stats.appearances} games · ${stats.record.wins}-${stats.record.draws}-${stats.record.losses} · ${formatWinRate(stats.record.winRate)}`}
          </ThemedTextBox>
          <ThemedTextBox variant="caption" color="secondary">
            {`GD ${formatGoalDifference(stats.record.averageGoalDifference, 1)}/game · Rating ${formatRating(stats.averageRating)} · POTM ${stats.playerOfTheMatch}`}
          </ThemedTextBox>
        </View>
        <FormBadges form={stats.form} />
      </View>
      {expanded && (
        <View style={[styles.playerDetails, { borderTopColor: colors.border }]}>
          <ThemedTextBox variant="caption" color="secondary">
            {`Total GD ${formatGoalDifference(stats.record.goalDifference)} · rated in ${stats.ratedGames} games`}
          </ThemedTextBox>
          <ThemedTextBox variant="caption" color="secondary">
            {`Streaks: currently ${formatStreak(stats.currentStreak)} · best ${stats.longestWinStreak} wins in a row · ${stats.longestUnbeatenStreak} unbeaten`}
          </ThemedTextBox>
          <PartnerLine label="Best partner" summary={stats.bestPartner} />
          <PartnerLine label="Worst partner" summary={stats.worstPartner} />
          <PartnerLine label="Nemesis" summary={stats.nemesis} />
        </View>
      )}
    </Pressable>
  );
}

function PartnershipCard({
  title,
  emptyText,
  partnerships,
}: {
  title: string;
  emptyText: string;
  partnerships: PartnershipStats[];
}) {
  return (
    <ThemedCard variant="outlined" title={title}>
      {partnerships.length === 0 ? (
        <ThemedTextBox variant="caption" color="secondary">
          {emptyText}
        </ThemedTextBox>
      ) : (
        <View style={styles.list}>
          {partnerships.map(({ players, record }) => (
            <View key={players.map((p) => p.userId).join('|')}>
              <ThemedTextBox variant="body" weight="medium">
                {`${players[0].name} & ${players[1].name}`}
              </ThemedTextBox>
              <ThemedTextBox variant="caption" color="secondary">
                {`${formatRecord(record)} · ${formatWinRate(record.winRate)} wins${
                  record.averageGoalDifference !== null
                    ? ` · ${formatGoalDifference(record.averageGoalDifference, 1)} GD/game`
                    : ''
                }`}
              </ThemedTextBox>
            </View>
          ))}
        </View>
      )}
    </ThemedCard>
  );
}

export function GroupStatsScreen({ groupId, onGoBack, onNavigateToGame }: GroupStatsScreenProps) {
  const { colors } = useTheme();
  const { appearances, isLoading, refetch } = useGroupStats(groupId);
  const { refreshing, onRefresh } = useRefreshControl(refetch);
  const [range, setRange] = useState<GroupStatsRange>('all');
  const [sortKey, setSortKey] = useState<PlayerStatsSortKey>('appearances');
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const stats = useMemo(
    () => computeGroupStats(filterAppearancesByRange(appearances, range)),
    [appearances, range]
  );
  const sortedPlayers = useMemo(
    () => sortPlayerStats(stats.players, sortKey),
    [stats.players, sortKey]
  );
  const { summary } = stats;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton variant="ghost" onPress={onGoBack} title="← Back" />
        <ThemedTextBox variant="subheading" weight="semibold">
          Player Stats
        </ThemedTextBox>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.chips}>
            {GROUP_STATS_RANGES.map((option) => (
              <ThemedButton
                key={option.value}
                title={option.label}
                size="small"
                variant={option.value === range ? 'primary' : 'outline'}
                onPress={() => setRange(option.value)}
              />
            ))}
          </View>

          {summary.gamesPlayed === 0 ? (
            <ThemedTextBox variant="body" color="secondary" align="center" style={styles.empty}>
              No played games yet. Stats appear once a game has kicked off with players assigned to
              a team.
            </ThemedTextBox>
          ) : (
            <View style={styles.sections}>
              <View style={styles.summaryGrid}>
                {[
                  { label: 'Games played', value: String(summary.gamesPlayed) },
                  { label: 'Players', value: String(summary.playerCount) },
                  {
                    label: 'Goals per game',
                    value:
                      summary.averageGoalsPerGame === null
                        ? '–'
                        : summary.averageGoalsPerGame.toFixed(1),
                  },
                  { label: 'Draws', value: formatWinRate(summary.drawRate) },
                ].map((tile) => (
                  <SummaryTile key={tile.label} label={tile.label} value={tile.value} />
                ))}
                {summary.mostGamesPlayed && (
                  <SummaryTile
                    label="Most games played"
                    value={formatPlayerNames(summary.mostGamesPlayed.players)}
                    detail={`${summary.mostGamesPlayed.games} games`}
                    fullWidth
                  />
                )}
              </View>

              {summary.biggestWin && (
                <ThemedButton
                  variant="ghost"
                  size="small"
                  title={`Biggest win: ${summary.biggestWin.winnerScore}–${summary.biggestWin.loserScore} on ${formatDate(summary.biggestWin.kickoffDate)}`}
                  onPress={() => onNavigateToGame(summary.biggestWin!.gameId)}
                />
              )}

              {stats.awards.length > 0 && (
                <View style={styles.list}>
                  <ThemedTextBox variant="subheading" weight="semibold">
                    Awards
                  </ThemedTextBox>
                  {stats.awards.map((award) => (
                    <ThemedCard key={award.key} variant="outlined">
                      <ThemedTextBox variant="caption" color="tertiary" weight="medium">
                        {award.title.toUpperCase()}
                      </ThemedTextBox>
                      <ThemedTextBox variant="body" weight="semibold">
                        {award.winners.join(', ')}
                      </ThemedTextBox>
                      <ThemedTextBox variant="caption" color="secondary">
                        {`${award.detail} · ${award.description}`}
                      </ThemedTextBox>
                    </ThemedCard>
                  ))}
                </View>
              )}

              <View style={styles.list}>
                <ThemedTextBox variant="subheading" weight="semibold">
                  Players
                </ThemedTextBox>
                <View style={styles.chips}>
                  {PLAYER_STATS_SORT_OPTIONS.map((option) => (
                    <ThemedButton
                      key={option.value}
                      title={option.label}
                      size="small"
                      variant={option.value === sortKey ? 'primary' : 'outline'}
                      onPress={() => setSortKey(option.value)}
                    />
                  ))}
                </View>
                {sortedPlayers.map((playerStats) => (
                  <PlayerRow
                    key={playerStats.player.userId}
                    stats={playerStats}
                    expanded={expandedPlayerId === playerStats.player.userId}
                    onToggle={() =>
                      setExpandedPlayerId(
                        expandedPlayerId === playerStats.player.userId
                          ? null
                          : playerStats.player.userId
                      )
                    }
                  />
                ))}
              </View>

              <PartnershipCard
                title="Dream teams"
                emptyText="No partnership has won at least half its games yet."
                partnerships={stats.bestPartnerships}
              />
              <PartnershipCard
                title="Cursed combos"
                emptyText="No partnership has a losing record yet."
                partnerships={stats.worstPartnerships}
              />

              {stats.rivalries.length > 0 && (
                <ThemedCard variant="outlined" title="Rivalries">
                  <View style={styles.list}>
                    {stats.rivalries.map((rivalry) => (
                      <View key={rivalry.players.map((p) => p.userId).join('|')}>
                        <ThemedTextBox variant="body" weight="medium">
                          {`${rivalry.players[0].name} vs ${rivalry.players[1].name}`}
                        </ThemedTextBox>
                        <ThemedTextBox variant="caption" color="secondary">
                          {`${rivalry.wins[0]}–${rivalry.draws}–${rivalry.wins[1]} · ${rivalry.games} games`}
                        </ThemedTextBox>
                      </View>
                    ))}
                  </View>
                </ThemedCard>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerSpacer: {
    width: 64,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  empty: {
    marginTop: 24,
  },
  sections: {
    gap: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryTile: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  summaryTileFull: {
    flexBasis: '100%',
  },
  list: {
    gap: 8,
  },
  playerRow: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playerRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    flex: 1,
    gap: 2,
  },
  playerDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: 2,
  },
  formBadge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
});
