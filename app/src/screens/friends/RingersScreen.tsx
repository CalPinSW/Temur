import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useSavedRingers } from '@/hooks/useSavedRingers';
import { useSavedRingerActions } from '@/hooks/useSavedRingerActions';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox, ThemedInput } from '@/components/themed';
import { SavedRinger } from '@/types/game';

interface RingersScreenProps {
  onGoBack: () => void;
}

export function RingersScreen({ onGoBack }: RingersScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [nameInput, setNameInput] = useState('');

  const { ringers, isLoading, refetch } = useSavedRingers(user?.id);
  const { isAddingRinger, isDeletingRinger, handleAddSavedRinger, handleDeleteSavedRinger } =
    useSavedRingerActions(user?.id);
  const { refreshing: isRefreshing, onRefresh: handleRefresh } = useRefreshControl(refetch);

  const handleAdd = () => {
    handleAddSavedRinger(nameInput, () => {
      setNameInput('');
      refetch();
    });
  };

  const renderRinger = ({ item }: { item: SavedRinger }) => (
    <View style={[styles.ringerItem, { borderBottomColor: colors.border }]}>
      <ThemedTextBox variant="body" weight="semibold" style={styles.ringerName}>
        {item.name}
      </ThemedTextBox>
      <ThemedButton
        variant="ghost"
        style={styles.removeButton}
        onPress={() => handleDeleteSavedRinger(item.id, item.name, refetch)}
        disabled={isDeletingRinger}
        title="✕"
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedTextBox variant="subheading" weight="semibold" align="center">
        No saved ringers yet
      </ThemedTextBox>
      <View style={styles.emptySubtextContainer}>
        <ThemedTextBox variant="body" color="secondary" align="center">
          Ringers you add to a game are saved here automatically, or add one above to have it ready
          next time.
        </ThemedTextBox>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton variant="ghost" onPress={onGoBack} title="← Back" />
        <ThemedTextBox variant="heading">Saved Ringers</ThemedTextBox>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.addSection, { borderBottomColor: colors.border }]}>
        <ThemedInput
          label="Ringer's name"
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="e.g. Alex Smith"
        />
        <ThemedButton
          title={isAddingRinger ? 'Adding...' : 'Add Ringer'}
          variant="primary"
          onPress={handleAdd}
          disabled={isAddingRinger || !nameInput.trim()}
          style={styles.addButton}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={ringers}
          keyExtractor={(item) => item.id}
          renderItem={renderRinger}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={ringers.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primaryHover}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  placeholder: {
    width: 50,
  },
  addSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  addButton: {
    marginTop: 12,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  ringerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ringerName: {
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptySubtextContainer: {
    marginTop: 8,
  },
});
