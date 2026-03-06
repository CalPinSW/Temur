import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox, ThemedCard, ThemedDateTimePicker, ThemedInput, ThemedDropdown, DropdownOption } from '@/components/themed';
import { supabase } from '@/services/supabase';

const getNextSaturday = (fromDate: Date): Date => {
  const date = new Date(fromDate);
  date.setHours(10, 45, 0, 0);
  const dayOfWeek = date.getDay();
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek + 7) % 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return date;
};

const getSundayBefore = (saturday: Date): Date => {
  const sunday = new Date(saturday);
  sunday.setDate(sunday.getDate() - 6);
  sunday.setHours(15, 0, 0, 0);
  return sunday;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export function AdminScreen() {
  const { colors } = useTheme();
  const [kickoffDate, setKickoffDate] = useState<Date>(getNextSaturday(new Date()));
  const [visibleAt, setVisibleAt] = useState<Date>(getSundayBefore(getNextSaturday(new Date())));
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [team1Name, setTeam1Name] = useState('Black');
  const [team2Name, setTeam2Name] = useState('White');
  const [playersPerTeam, setPlayersPerTeam] = useState(6);

  const playersPerTeamOptions: DropdownOption<number>[] = [
    { label: '5 a-side', value: 5 },
    { label: '6 a-side', value: 6 },
    { label: '7 a-side', value: 7 },
    { label: '8 a-side', value: 8 },
    { label: '9 a-side', value: 9 },
    { label: '10 a-side', value: 10 },
    { label: '11 a-side', value: 11 },
  ];

  useEffect(() => {
    const loadDefaultDates = async () => {
      try {
        setIsLoadingDefaults(true);

        const { data: existingGames, error } = await supabase
          .from('games')
          .select('kickoff_date')
          .gte('kickoff_date', new Date().toISOString())
          .order('kickoff_date', { ascending: true });

        if (error) throw error;

        const existingGameDates = (existingGames || []).map(
          (game) => new Date(game.kickoff_date)
        );

        let candidateDate = getNextSaturday(new Date());

        while (existingGameDates.some((gameDate) => isSameDay(gameDate, candidateDate))) {
          candidateDate = getNextSaturday(new Date(candidateDate.getTime() + 7 * 24 * 60 * 60 * 1000));
        }

        setKickoffDate(candidateDate);
        setVisibleAt(getSundayBefore(candidateDate));
      } catch (error) {
        console.error('Error loading default dates:', error);
      } finally {
        setIsLoadingDefaults(false);
      }
    };

    loadDefaultDates();
  }, []);

  const handleCreateGame = async () => {
    try {
      setIsCreating(true);

      const { data, error } = await supabase
        .from('games')
        .insert({
          kickoff_date: kickoffDate.toISOString(),
          visible_at: visibleAt.toISOString(),
          team1_name: team1Name,
          team2_name: team2Name,
          players_per_team: playersPerTeam,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Game created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setKickoffDate(new Date());
            setVisibleAt(new Date());
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating game:', error);
      Alert.alert('Error', 'Failed to create game. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedTextBox variant="heading" weight="bold" color="primary">
            Admin Panel
          </ThemedTextBox>
          <ThemedTextBox variant="body" color="secondary" style={styles.subtitle}>
            Create and schedule games
          </ThemedTextBox>
        </View>

        <ThemedCard title="Create New Game" variant="elevated">
          {isLoadingDefaults && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <ThemedTextBox variant="caption" color="secondary" style={styles.loadingText}>
                Finding next available Saturday...
              </ThemedTextBox>
            </View>
          )}
          <ThemedDateTimePicker
            label="Kickoff Date & Time"
            value={kickoffDate}
            mode="datetime"
            onChange={setKickoffDate}
          />

          <View style={styles.formSection}>
            <ThemedTextBox variant="caption" color="secondary" style={styles.helperText}>
              When should players be able to see and sign up for this game?
            </ThemedTextBox>
            <ThemedDateTimePicker
              label="Visible From"
              value={visibleAt}
              mode="datetime"
              onChange={setVisibleAt}
            />
          </View>

          <View style={styles.formSection}>
            <ThemedTextBox variant="caption" color="secondary" style={styles.helperText}>
              Players per team
            </ThemedTextBox>
            <ThemedDropdown
              label="Players per Team"
              value={playersPerTeam}
              options={playersPerTeamOptions}
              onChange={setPlayersPerTeam}
            />
          </View>
          <View style={styles.formSection}>
            <ThemedTextBox variant="caption" color="secondary" style={styles.helperText}>
              What colours should the teams be?
            </ThemedTextBox>
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
          <View style={styles.buttonContainer}>
            <ThemedButton
              title={isCreating ? 'Creating...' : 'Create Game'}
              variant="primary"
              onPress={handleCreateGame}
              disabled={isCreating}
            />
          </View>

          {isCreating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ThemedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 8,
  },
  formSection: {
    marginBottom: 24,
  },
  teamNameContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  teamInputWrapper: {
    flex: 1,
  },
  helperText: {
    marginBottom: 12,
  },
  buttonContainer: {
    marginTop: 8,
  },
  loadingContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
  },
  quickActions: {
    marginTop: 16,
  },
  quickActionButton: {
    marginBottom: 8,
  },
});
