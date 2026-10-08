import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox } from '@/components/themed';
import { useGameSignupEvents } from '@/hooks/useGameSignupEvents';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { GameSignupEvent, describeGameSignupEvent, formatSignupEventTime } from '@temur/shared';

interface GameActivityLogScreenProps {
  gameId: string;
  onGoBack: () => void;
}

export function GameActivityLogScreen({ gameId, onGoBack }: GameActivityLogScreenProps) {
  const { colors } = useTheme();
  const { events, isLoading, refetch } = useGameSignupEvents(gameId);
  const { refreshing, onRefresh } = useRefreshControl(refetch);

  const renderEvent = ({ item }: { item: GameSignupEvent }) => (
    <View style={[styles.eventRow, { borderColor: colors.border }]}>
      <View style={styles.eventDescription}>
        <ThemedTextBox variant="body">{describeGameSignupEvent(item)}</ThemedTextBox>
      </View>
      <ThemedTextBox variant="caption" color="secondary">
        {formatSignupEventTime(item.created_at)}
      </ThemedTextBox>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton variant="ghost" onPress={onGoBack} title="← Back" />
        <ThemedTextBox variant="subheading" weight="semibold">
          Activity Log
        </ThemedTextBox>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.centered}>
              <ThemedTextBox variant="body" color="secondary" align="center">
                No one has joined or left this game yet.
              </ThemedTextBox>
            </View>
          }
          contentContainerStyle={events.length === 0 ? styles.emptyList : styles.list}
        />
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
  list: {
    padding: 16,
    gap: 8,
  },
  emptyList: {
    flex: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eventDescription: {
    flex: 1,
  },
});
