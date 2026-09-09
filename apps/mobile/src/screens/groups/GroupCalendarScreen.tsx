import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox } from '@/components/themed';
import { GameOverviewCard } from '@/components/game/GameOverviewCard';
import { useGroupGames } from '@/hooks/useGroupGames';
import { useAuthStore } from '@/store/authStore';
import { groupByDay, toDateKey, formatDate } from '@temur/shared';

interface GroupCalendarScreenProps {
  groupId: string;
  onGoBack: () => void;
  onNavigateToGame: (gameId: string) => void;
}

export function GroupCalendarScreen({
  groupId,
  onGoBack,
  onNavigateToGame,
}: GroupCalendarScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { games, isLoading } = useGroupGames(groupId, user?.id);

  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const gamesByDay = useMemo(() => groupByDay(games, (g) => new Date(g.kickoff_date)), [games]);

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }
    > = {};
    for (const key of Object.keys(gamesByDay)) {
      marks[key] = { marked: true, dotColor: colors.primary };
    }
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: colors.primary,
    };
    return marks;
  }, [gamesByDay, selectedDate, colors.primary]);

  const selectedGames = gamesByDay[selectedDate] ?? [];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton variant="ghost" onPress={onGoBack} title="← Back" />
        <ThemedTextBox variant="subheading" weight="semibold">
          Calendar
        </ThemedTextBox>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Calendar
            key={colors.background}
            current={selectedDate}
            firstDay={1}
            enableSwipeMonths
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              calendarBackground: colors.card,
              monthTextColor: colors.text,
              dayTextColor: colors.text,
              textDisabledColor: colors.textTertiary,
              textSectionTitleColor: colors.textSecondary,
              arrowColor: colors.primary,
              todayTextColor: colors.primary,
              selectedDayTextColor: '#FFFFFF',
              dotColor: colors.primary,
              selectedDotColor: '#FFFFFF',
            }}
          />

          <View style={styles.dayHeader}>
            <ThemedTextBox variant="body" weight="semibold">
              {formatDate(`${selectedDate}T12:00:00`)}
            </ThemedTextBox>
          </View>

          {selectedGames.length === 0 ? (
            <ThemedTextBox variant="body" color="secondary" style={styles.emptyText}>
              No games on this day.
            </ThemedTextBox>
          ) : (
            selectedGames.map((game) => (
              <GameOverviewCard key={game.id} game={game} onNavigateToGame={onNavigateToGame} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  placeholder: { width: 64 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 12 },
  dayHeader: { marginTop: 8 },
  emptyText: { marginTop: 4 },
});
