import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox, ThemedBadge } from '@/components/themed';
import { EmptyState } from '@/components';
import { useAuthStore } from '@/store/authStore';
import { useGroups } from '@/hooks/useGroups';
import { useGroupInvitations } from '@/hooks/useGroupInvitations';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { GroupWithRole } from '@temur/shared';

interface GroupsListScreenProps {
  onNavigateToCreate: () => void;
  onNavigateToGroup: (groupId: string) => void;
  onNavigateToInvites: () => void;
}

export function GroupsListScreen({
  onNavigateToCreate,
  onNavigateToGroup,
  onNavigateToInvites,
}: GroupsListScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { groups, isLoading, refetch: refetchGroups } = useGroups(user?.id);
  const { invitations, refetch: refetchInvitations } = useGroupInvitations(user?.id);
  const refreshData = useCallback(
    () => Promise.all([refetchGroups(), refetchInvitations()]),
    [refetchGroups, refetchInvitations]
  );
  const { refreshing, onRefresh } = useRefreshControl(refreshData);

  const renderGroup = ({ item }: { item: GroupWithRole }) => (
    <TouchableOpacity
      style={[styles.groupItem, { borderBottomColor: colors.border }]}
      onPress={() => onNavigateToGroup(item.id)}
    >
      <View style={styles.groupInfo}>
        <ThemedTextBox variant="body" weight="semibold">
          {item.name}
        </ThemedTextBox>
        {item.description && (
          <ThemedTextBox variant="caption" color="secondary">
            {item.description}
          </ThemedTextBox>
        )}
      </View>
      {item.myRole === 'admin' && <ThemedBadge text="Admin" variant="info" />}
      <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="🧑‍🤝‍🧑"
      title="No groups yet"
      message="Create a group to start organizing games with your regulars"
      actionLabel="Create Group"
      onAction={onNavigateToCreate}
    />
  );

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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedTextBox variant="heading" weight="semibold">
          Groups
        </ThemedTextBox>
        <ThemedButton
          variant="ghost"
          onPress={onNavigateToCreate}
          title="+"
          textStyle={styles.addIcon}
        />
      </View>

      {invitations.length > 0 && (
        <TouchableOpacity
          style={[styles.invitesBanner, { backgroundColor: colors.backgroundTertiary }]}
          onPress={onNavigateToInvites}
        >
          <View style={styles.invitesBannerContent}>
            <ThemedBadge text={`${invitations.length}`} variant="info" />
            <ThemedTextBox variant="body" weight="semibold">
              {`pending group invite${invitations.length > 1 ? 's' : ''}`}
            </ThemedTextBox>
          </View>
          <Text style={[styles.invitesArrow, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroup}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={groups.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
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
  addIcon: {
    fontSize: 28,
    fontWeight: '300',
  },
  invitesBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  invitesBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invitesArrow: {
    fontSize: 20,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  groupInfo: {
    flex: 1,
    gap: 2,
  },
  arrow: {
    fontSize: 20,
  },
});
