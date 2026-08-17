import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/services/supabase';
import { isVisibleAtBeforeKickoff } from '@temur/shared';

interface EditGameScreenProps {
  gameId: string;
  onGoBack: () => void;
  onSaved: () => void;
}

interface EditableGame {
  game_description: string | null;
  kickoff_date: string;
  visible_at: string;
  team1_name: string;
  team2_name: string;
  players_per_team: number;
}

const playersPerTeamOptions: DropdownOption<number>[] = [5, 6, 7, 8, 9, 10, 11].map((n) => ({
  label: `${n} a-side`,
  value: n,
}));

export function EditGameScreen({ gameId, onGoBack, onSaved }: EditGameScreenProps) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [gameDescription, setGameDescription] = useState('');
  const [kickoffDate, setKickoffDate] = useState<Date>(new Date());
  const [visibleAt, setVisibleAt] = useState<Date>(new Date());
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [playersPerTeam, setPlayersPerTeam] = useState(6);

  useEffect(() => {
    const loadGame = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('games')
          .select(
            'game_description, kickoff_date, visible_at, team1_name, team2_name, players_per_team'
          )
          .eq('id', gameId)
          .single();

        if (error) throw error;

        const game = data as EditableGame;
        setGameDescription(game.game_description ?? '');
        setKickoffDate(new Date(game.kickoff_date));
        setVisibleAt(new Date(game.visible_at));
        setTeam1Name(game.team1_name);
        setTeam2Name(game.team2_name);
        setPlayersPerTeam(game.players_per_team);
      } catch (error) {
        console.error('Error loading game to edit:', error);
        Sentry.captureException(error);
        Alert.alert('Error', 'Failed to load game details.');
        onGoBack();
      } finally {
        setIsLoading(false);
      }
    };

    loadGame();
  }, [gameId, onGoBack]);

  const handleSave = async () => {
    if (!isVisibleAtBeforeKickoff(kickoffDate, visibleAt)) {
      Alert.alert('Invalid Dates', '"Visible From" must be before the kickoff time.');
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('games')
        .update({
          game_description: gameDescription || null,
          kickoff_date: kickoffDate.toISOString(),
          visible_at: visibleAt.toISOString(),
          team1_name: team1Name,
          team2_name: team2Name,
          players_per_team: playersPerTeam,
        })
        .eq('id', gameId);

      if (error) throw error;

      onSaved();
    } catch (error) {
      console.error('Error saving game:', error);
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
        <ThemedTextBox variant="heading" weight="bold" color="primary">
          Edit Game
        </ThemedTextBox>

        <ThemedCard title="Game Details" variant="elevated">
          <ThemedInput
            label="Description"
            value={gameDescription}
            onChangeText={setGameDescription}
            multiline
          />

          <View style={styles.formSection}>
            <ThemedDateTimePicker
              label="Kickoff Date & Time"
              value={kickoffDate}
              mode="datetime"
              onChange={setKickoffDate}
            />
          </View>

          <View style={styles.formSection}>
            <ThemedDateTimePicker
              label="Visible From"
              value={visibleAt}
              mode="datetime"
              onChange={setVisibleAt}
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

          <View style={styles.buttonContainer}>
            <ThemedButton
              title={isSaving ? 'Saving...' : 'Save Changes'}
              variant="primary"
              onPress={handleSave}
              disabled={isSaving}
            />
          </View>
        </ThemedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  buttonContainer: {
    marginTop: 8,
  },
});
