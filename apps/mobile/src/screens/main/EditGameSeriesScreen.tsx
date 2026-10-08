import React, { useEffect, useState } from 'react';
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
  DEFAULT_VISIBLE_AT_LEAD_DAYS,
  WallClockTime,
  getSeriesVisibility,
  getSeriesVisibleAt,
  getSeriesVisibleDaysBeforeOptions,
  getWallClockTime,
  isVisibleAtBeforeKickoff,
  setWallClockTime,
} from '@temur/shared';
import { supabase } from '@/services/supabase';

interface EditGameSeriesScreenProps {
  seriesId: string;
  onGoBack: () => void;
  onSaved: () => void;
}

interface UpcomingGame {
  id: string;
  kickoff_date: string;
  visible_at: string;
  team1_name: string;
  team2_name: string;
  players_per_team: number;
  game_description: string | null;
}

const playersPerTeamOptions: DropdownOption<number>[] = [5, 6, 7, 8, 9, 10, 11].map((n) => ({
  label: `${n} a-side`,
  value: n,
}));

// The time pickers work in device-local Dates; this keeps their displayed
// time equal to the game's UK wall-clock time.
const toPickerTime = ({ hours, minutes }: WallClockTime): Date => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const fromPickerTime = (date: Date): WallClockTime => ({
  hours: date.getHours(),
  minutes: date.getMinutes(),
});

export function EditGameSeriesScreen({ seriesId, onGoBack, onSaved }: EditGameSeriesScreenProps) {
  const { colors } = useTheme();

  const [games, setGames] = useState<UpcomingGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [kickoffTime, setKickoffTime] = useState<Date>(new Date());
  const [visibleDaysBefore, setVisibleDaysBefore] = useState(DEFAULT_VISIBLE_AT_LEAD_DAYS);
  const [visibleTime, setVisibleTime] = useState<Date>(new Date());
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [playersPerTeam, setPlayersPerTeam] = useState(6);
  const [gameDescription, setGameDescription] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('games')
          .select(
            'id, kickoff_date, visible_at, team1_name, team2_name, players_per_team, game_description'
          )
          .eq('series_id', seriesId)
          .is('deleted_at', null)
          .gte('kickoff_date', new Date().toISOString())
          .order('kickoff_date', { ascending: true });

        if (error) throw error;

        const upcoming = (data ?? []) as UpcomingGame[];
        setGames(upcoming);

        const next = upcoming[0];
        if (next) {
          const nextKickoff = new Date(next.kickoff_date);
          setKickoffTime(toPickerTime(getWallClockTime(nextKickoff)));
          setTeam1Name(next.team1_name);
          setTeam2Name(next.team2_name);
          setPlayersPerTeam(next.players_per_team);
          setGameDescription(next.game_description ?? '');
          const visibility = getSeriesVisibility(nextKickoff, new Date(next.visible_at));
          setVisibleDaysBefore(visibility.daysBefore);
          setVisibleTime(toPickerTime(visibility));
        }
      } catch (error) {
        console.error('Error loading recurring block:', error);
        Sentry.captureException(error);
        Alert.alert('Error', 'Failed to load the recurring block.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [seriesId]);

  const handleSave = async () => {
    if (games.length === 0) return;

    const kickoffs = games.map((g) =>
      setWallClockTime(new Date(g.kickoff_date), fromPickerTime(kickoffTime))
    );
    const visibleAts = kickoffs.map((k) =>
      getSeriesVisibleAt(k, { daysBefore: visibleDaysBefore, ...fromPickerTime(visibleTime) })
    );
    if (kickoffs.some((k, i) => !isVisibleAtBeforeKickoff(k, visibleAts[i]))) {
      Alert.alert('Check visibility', 'Each game must become visible before it kicks off.');
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase.rpc('update_game_series_future', {
        p_series_id: seriesId,
        p_game_ids: games.map((g) => g.id),
        p_kickoffs: kickoffs.map((d) => d.toISOString()),
        p_visible_ats: visibleAts.map((d) => d.toISOString()),
        p_team1_name: team1Name,
        p_team2_name: team2Name,
        p_players_per_team: playersPerTeam,
        p_game_description: gameDescription || null,
      });

      if (error) throw error;

      Alert.alert('Saved', `Updated ${games.length} upcoming games.`, [
        { text: 'OK', onPress: onSaved },
      ]);
    } catch (error) {
      console.error('Error updating recurring block:', error);
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to update the recurring block. Please try again.');
    } finally {
      setIsSaving(false);
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
            Edit Recurring Block
          </ThemedTextBox>
          {!isLoading && (
            <ThemedTextBox variant="body" color="secondary" style={styles.subtitle}>
              {games.length === 0
                ? 'This block has no upcoming games left to edit.'
                : `Changes apply to all ${games.length} upcoming game${
                    games.length === 1 ? '' : 's'
                  }. Games already played are left as they are.`}
            </ThemedTextBox>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : games.length === 0 ? null : (
          <>
            <ThemedCard title="Block Details" variant="elevated">
              <ThemedInput
                label="Description"
                value={gameDescription}
                onChangeText={setGameDescription}
                multiline
              />

              <View style={styles.formSection}>
                <ThemedTextBox variant="caption" color="secondary" style={styles.helperText}>
                  Applied to each upcoming game on its own date.
                </ThemedTextBox>
                <ThemedDateTimePicker
                  label="Kickoff Time"
                  value={kickoffTime}
                  mode="time"
                  onChange={setKickoffTime}
                />
              </View>

              <View style={styles.formSection}>
                <ThemedDropdown
                  label="Visible From"
                  value={visibleDaysBefore}
                  options={getSeriesVisibleDaysBeforeOptions(visibleDaysBefore)}
                  onChange={setVisibleDaysBefore}
                />
              </View>

              <View style={styles.formSection}>
                <ThemedDateTimePicker
                  label="Visible From Time"
                  value={visibleTime}
                  mode="time"
                  onChange={setVisibleTime}
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
                    <ThemedInput
                      label="Team 1 Name"
                      value={team1Name}
                      onChangeText={setTeam1Name}
                    />
                  </View>
                  <View style={styles.teamInputWrapper}>
                    <ThemedInput
                      label="Team 2 Name"
                      value={team2Name}
                      onChangeText={setTeam2Name}
                    />
                  </View>
                </View>
              </View>
            </ThemedCard>

            <View style={styles.buttonContainer}>
              <ThemedButton
                title={isSaving ? 'Saving...' : 'Save Changes to Block'}
                variant="primary"
                onPress={handleSave}
                disabled={isSaving}
              />
            </View>
          </>
        )}
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
  buttonContainer: { marginTop: 8 },
});
