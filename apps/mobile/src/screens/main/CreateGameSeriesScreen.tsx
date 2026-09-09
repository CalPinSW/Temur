import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import * as Sentry from '@sentry/react-native';
import {
  ThemedButton,
  ThemedTextBox,
  ThemedCard,
  ThemedDateTimePicker,
  ThemedInput,
  ThemedDropdown,
  DropdownOption,
} from '@/components/themed';
import {
  MAX_SERIES_GAMES,
  SERIES_INTERVAL_WEEKS_OPTIONS,
  DEFAULT_VISIBLE_AT_LEAD_DAYS,
  formatDate,
  formatTime,
  generateSeriesKickoffs,
  getDefaultSeriesEndDate,
  getNextSaturday,
  getVisibleAtWithLead,
} from '@temur/shared';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';

interface CreateGameSeriesScreenProps {
  groupId: string;
  onGoBack: () => void;
  onCreated: () => void;
}

const playersPerTeamOptions: DropdownOption<number>[] = [5, 6, 7, 8, 9, 10, 11].map((n) => ({
  label: `${n} a-side`,
  value: n,
}));

const intervalOptions: DropdownOption<number>[] = SERIES_INTERVAL_WEEKS_OPTIONS.map((n) => ({
  label: n === 1 ? 'Every week' : `Every ${n} weeks`,
  value: n,
}));

const visibleLeadOptions: DropdownOption<number>[] = [2, 3, 4, 5, 6, 7, 10, 14].map((n) => ({
  label: `${n} days before`,
  value: n,
}));

export function CreateGameSeriesScreen({
  groupId,
  onGoBack,
  onCreated,
}: CreateGameSeriesScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);

  const defaultFirst = useMemo(() => getNextSaturday(new Date()), []);
  const [firstKickoff, setFirstKickoff] = useState<Date>(defaultFirst);
  const [endDate, setEndDate] = useState<Date>(getDefaultSeriesEndDate(defaultFirst));
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [intervalWeeks, setIntervalWeeks] = useState(1);
  const [visibleLeadDays, setVisibleLeadDays] = useState(DEFAULT_VISIBLE_AT_LEAD_DAYS);
  const [team1Name, setTeam1Name] = useState('Black');
  const [team2Name, setTeam2Name] = useState('White');
  const [playersPerTeam, setPlayersPerTeam] = useState(6);
  const [isCreating, setIsCreating] = useState(false);

  const handleFirstKickoffChange = (date: Date) => {
    setFirstKickoff(date);
    if (!endDateTouched) {
      setEndDate(getDefaultSeriesEndDate(date));
    }
  };

  const kickoffs = useMemo(
    () => generateSeriesKickoffs(firstKickoff, endDate, intervalWeeks),
    [firstKickoff, endDate, intervalWeeks]
  );

  const tooFew = kickoffs.length < 2;
  const tooMany = kickoffs.length > MAX_SERIES_GAMES;

  const handleCreate = async () => {
    if (!user) return;

    if (tooFew) {
      Alert.alert('Not enough games', 'That range only covers one game — pick a later end date.');
      return;
    }
    if (tooMany) {
      Alert.alert(
        'Too many games',
        `A recurring block can have at most ${MAX_SERIES_GAMES} games.`
      );
      return;
    }

    try {
      setIsCreating(true);
      const visibleAts = kickoffs.map((k) => getVisibleAtWithLead(k, visibleLeadDays));

      const { error } = await supabase.rpc('create_game_series', {
        p_group_id: groupId,
        p_interval_weeks: intervalWeeks,
        p_kickoffs: kickoffs.map((d) => d.toISOString()),
        p_visible_ats: visibleAts.map((d) => d.toISOString()),
        p_team1_name: team1Name,
        p_team2_name: team2Name,
        p_players_per_team: playersPerTeam,
      });

      if (error) throw error;

      Alert.alert('Scheduled', `${kickoffs.length} games added.`, [
        { text: 'OK', onPress: onCreated },
      ]);
    } catch (error) {
      console.error('Error creating game series:', error);
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to schedule the games. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <ThemedButton title="← Back" variant="ghost" onPress={onGoBack} style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedTextBox variant="heading" weight="bold" color="primary">
            Schedule Recurring Games
          </ThemedTextBox>
          <ThemedTextBox variant="body" color="secondary" style={styles.subtitle}>
            Creates one game per interval between the first kickoff and the end date. You can edit
            or cancel the upcoming games as a block afterwards.
          </ThemedTextBox>
        </View>

        <ThemedCard title="Schedule" variant="elevated">
          <ThemedDateTimePicker
            label="First Kickoff"
            value={firstKickoff}
            mode="datetime"
            onChange={handleFirstKickoffChange}
          />

          <View style={styles.formSection}>
            <ThemedDropdown
              label="Repeat"
              value={intervalWeeks}
              options={intervalOptions}
              onChange={setIntervalWeeks}
            />
          </View>

          <View style={styles.formSection}>
            <ThemedDateTimePicker
              label="Until"
              value={endDate}
              mode="date"
              onChange={(date) => {
                setEndDateTouched(true);
                setEndDate(date);
              }}
            />
          </View>

          <View style={styles.formSection}>
            <ThemedTextBox variant="caption" color="secondary" style={styles.helperText}>
              When players can see and sign up for each game.
            </ThemedTextBox>
            <ThemedDropdown
              label="Visible From"
              value={visibleLeadDays}
              options={visibleLeadOptions}
              onChange={setVisibleLeadDays}
            />
          </View>

          <View style={styles.formSection}>
            <ThemedDropdown
              label="Players per Team"
              value={playersPerTeam}
              options={playersPerTeamOptions}
              onChange={setPlayersPerTeam}
            />
          </View>

          <View style={styles.formSection}>
            <View style={styles.teamNameContainer}>
              <View style={styles.teamInputWrapper}>
                <ThemedInput label="Team 1 Name" value={team1Name} onChangeText={setTeam1Name} />
              </View>
              <View style={styles.teamInputWrapper}>
                <ThemedInput label="Team 2 Name" value={team2Name} onChangeText={setTeam2Name} />
              </View>
            </View>
          </View>
        </ThemedCard>

        <ThemedCard title="Preview" variant="elevated">
          {kickoffs.length === 0 ? (
            <ThemedTextBox variant="body" color="secondary">
              Pick a first kickoff and end date.
            </ThemedTextBox>
          ) : (
            <>
              <ThemedTextBox variant="body" weight="semibold">
                {tooFew
                  ? 'Only 1 game in this range — extend the end date'
                  : `${kickoffs.length} games${tooMany ? ` (over the ${MAX_SERIES_GAMES} limit)` : ''}`}
              </ThemedTextBox>
              {kickoffs.slice(0, 6).map((k) => (
                <ThemedTextBox
                  key={k.toISOString()}
                  variant="caption"
                  color="secondary"
                  style={styles.previewRow}
                >
                  {`${formatDate(k.toISOString())} · ${formatTime(k.toISOString())}`}
                </ThemedTextBox>
              ))}
              {kickoffs.length > 6 && (
                <ThemedTextBox variant="caption" color="secondary" style={styles.previewRow}>
                  {`…and ${kickoffs.length - 6} more`}
                </ThemedTextBox>
              )}
            </>
          )}
        </ThemedCard>

        <View style={styles.buttonContainer}>
          <ThemedButton
            title={isCreating ? 'Scheduling...' : 'Schedule Games'}
            variant="primary"
            onPress={handleCreate}
            disabled={isCreating || tooFew || tooMany}
          />
          {isCreating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1 },
  backButton: { alignSelf: 'flex-start' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 16 },
  header: { marginBottom: 8 },
  subtitle: { marginTop: 8 },
  formSection: { marginTop: 16 },
  helperText: { marginBottom: 8 },
  teamNameContainer: { width: '100%', flexDirection: 'row', gap: 12 },
  teamInputWrapper: { flex: 1 },
  previewRow: { marginTop: 4 },
  buttonContainer: { marginTop: 8 },
  loadingContainer: { marginTop: 16, alignItems: 'center' },
});
