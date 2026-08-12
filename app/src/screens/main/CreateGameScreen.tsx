import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  ThemedButton,
  ThemedTextBox,
  ThemedCard,
  ThemedDateTimePicker,
  ThemedInput,
  ThemedDropdown,
  ThemedToggle,
  DropdownOption,
} from '@/components/themed';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useGroups } from '@/hooks/useGroups';
import { useGroupAdminGroupIds } from '@/hooks/useGroupAdminGroupIds';
import { useAcceptedFriends } from '@/hooks/useAcceptedFriends';
import { inviteFriendsToGame } from '@/services/gameInvitationService';

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

interface CreateGameScreenProps {
  presetGroupId?: string;
  onGoBack: () => void;
  onCreated: () => void;
}

export function CreateGameScreen({ presetGroupId, onGoBack, onCreated }: CreateGameScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { groups } = useGroups(user?.id);
  const { adminGroupIds } = useGroupAdminGroupIds(user?.id);
  const { friends } = useAcceptedFriends(user?.id);

  const adminGroups = groups.filter((g) => adminGroupIds.has(g.id));
  const presetGroup = presetGroupId ? groups.find((g) => g.id === presetGroupId) : undefined;

  const [mode, setMode] = useState<'friends' | 'group'>(presetGroupId ? 'group' : 'friends');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(presetGroupId ?? null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

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

  const groupOptions: DropdownOption<string>[] = adminGroups.map((g) => ({
    label: g.name,
    value: g.id,
  }));

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

        const existingGameDates = (existingGames || []).map((game) => new Date(game.kickoff_date));

        let candidateDate = getNextSaturday(new Date());

        while (existingGameDates.some((gameDate) => isSameDay(gameDate, candidateDate))) {
          candidateDate = getNextSaturday(
            new Date(candidateDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          );
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

  useEffect(() => {
    if (!presetGroupId && mode === 'group' && !selectedGroupId && adminGroups.length > 0) {
      setSelectedGroupId(adminGroups[0].id);
    }
  }, [mode, adminGroups, presetGroupId, selectedGroupId]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleCreateGame = async () => {
    if (!user) return;

    if (mode === 'group' && !selectedGroupId) {
      Alert.alert('Select a Group', 'Choose which group this game is for.');
      return;
    }

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
          group_id: mode === 'group' ? selectedGroupId : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (mode === 'friends' && selectedFriendIds.size > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .single();
        const inviterName = profile?.display_name || profile?.username || 'Someone';

        await inviteFriendsToGame(data.id, Array.from(selectedFriendIds), user.id, inviterName);
      }

      Alert.alert('Success', 'Game created successfully!', [{ text: 'OK', onPress: onCreated }]);
    } catch (error) {
      console.error('Error creating game:', error);
      Alert.alert('Error', 'Failed to create game. Please try again.');
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
            Create Game
          </ThemedTextBox>
          <ThemedTextBox variant="body" color="secondary" style={styles.subtitle}>
            {mode === 'group'
              ? "Only your group's members will see this game."
              : 'Only friends you invite will see this game.'}
          </ThemedTextBox>
        </View>

        {!presetGroupId && (
          <ThemedCard variant="elevated">
            <View style={styles.modeToggle}>
              <ThemedButton
                title="Friends"
                variant={mode === 'friends' ? 'primary' : 'secondary'}
                size="small"
                onPress={() => setMode('friends')}
                style={styles.modeButton}
              />
              <ThemedButton
                title="Group"
                variant={mode === 'group' ? 'primary' : 'secondary'}
                size="small"
                onPress={() => setMode('group')}
                style={styles.modeButton}
                disabled={adminGroups.length === 0}
              />
            </View>
            {adminGroups.length === 0 && mode !== 'group' && (
              <ThemedTextBox variant="caption" color="secondary" style={styles.helperText}>
                You need to be an admin of a group to create a group game.
              </ThemedTextBox>
            )}
          </ThemedCard>
        )}

        {mode === 'group' && (
          <ThemedCard title="Group" variant="elevated">
            {presetGroup ? (
              <ThemedTextBox variant="body" weight="semibold">
                {presetGroup.name}
              </ThemedTextBox>
            ) : (
              <ThemedDropdown
                label="Which group is this game for?"
                value={selectedGroupId}
                options={groupOptions}
                onChange={setSelectedGroupId}
              />
            )}
          </ThemedCard>
        )}

        {mode === 'friends' && (
          <ThemedCard title="Invite Friends" variant="elevated">
            {friends.length === 0 ? (
              <ThemedTextBox variant="body" color="secondary">
                Add some friends first to invite them to a game.
              </ThemedTextBox>
            ) : (
              friends.map((friend) => (
                <View key={friend.id} style={styles.friendRow}>
                  <ThemedToggle
                    label={friend.display_name || friend.username}
                    value={selectedFriendIds.has(friend.id)}
                    onValueChange={() => toggleFriend(friend.id)}
                  />
                </View>
              ))
            )}
          </ThemedCard>
        )}

        <ThemedCard title="Game Details" variant="elevated">
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
                <ThemedInput label="Team 1 Name" value={team1Name} onChangeText={setTeam1Name} />
              </View>
              <View style={styles.teamInputWrapper}>
                <ThemedInput label="Team 2 Name" value={team2Name} onChangeText={setTeam2Name} />
              </View>
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <ThemedButton
              title={isCreating ? 'Creating...' : 'Create Game'}
              variant="primary"
              onPress={handleCreateGame}
              disabled={isCreating || (mode === 'group' && !selectedGroupId)}
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
  header: {
    marginBottom: 8,
  },
  subtitle: {
    marginTop: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
  },
  friendRow: {
    paddingVertical: 8,
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
});
