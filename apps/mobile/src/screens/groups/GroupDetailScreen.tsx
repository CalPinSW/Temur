import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox, ThemedCard, ThemedInput } from '@/components/themed';
import { useAuthStore } from '@/store/authStore';
import { useGroupDetails } from '@/hooks/useGroupDetails';
import { useGroupUpcomingGames } from '@/hooks/useGroupUpcomingGames';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { updateGroup, leaveGroup } from '@/services/groupService';
import { formatDate, formatTime } from '@temur/shared';

interface GroupDetailScreenProps {
  groupId: string;
  onGoBack: () => void;
  onNavigateToInvite: (groupId: string, groupName: string, existingMemberIds: string[]) => void;
  onNavigateToCreateGame: (groupId: string) => void;
  onNavigateToGames: (groupId: string) => void;
  onNavigateToGame: (gameId: string) => void;
  onNavigateToMembers: (groupId: string) => void;
}

export function GroupDetailScreen({
  groupId,
  onGoBack,
  onNavigateToInvite,
  onNavigateToCreateGame,
  onNavigateToGames,
  onNavigateToGame,
  onNavigateToMembers,
}: GroupDetailScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { group, members, isLoading, refetch } = useGroupDetails(groupId);
  const { upcomingGames } = useGroupUpcomingGames(groupId, user?.id);
  const { refreshing, onRefresh } = useRefreshControl(refetch);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMessageTemplate, setEditMessageTemplate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const myMembership = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMembership?.role === 'admin';

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

  if (!group) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.errorContainer}>
          <ThemedTextBox variant="body" color="secondary">
            Group not found
          </ThemedTextBox>
          <ThemedButton title="Go Back" variant="primary" onPress={onGoBack} />
        </View>
      </SafeAreaView>
    );
  }

  const startEditing = () => {
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditMessageTemplate(group.team_assignment_message_template || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;

    try {
      setIsSaving(true);
      await updateGroup(groupId, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        team_assignment_message_template: editMessageTemplate.trim() || null,
      });
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Error updating group:', error);
      Alert.alert('Error', 'Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert('Leave Group', `Are you sure you want to leave ${group.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          try {
            await leaveGroup(groupId, user.id);
            onGoBack();
          } catch (error) {
            console.error('Error leaving group:', error);
            Alert.alert('Error', 'Failed to leave group');
          }
        },
      },
    ]);
  };

  const handleUpcomingGamesPress = () => {
    if (upcomingGames.length === 1) {
      onNavigateToGame(upcomingGames[0].id);
    } else {
      onNavigateToGames(groupId);
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <ThemedCard variant="elevated">
          {isEditing ? (
            <View style={styles.editSection}>
              <ThemedInput label="Group Name" value={editName} onChangeText={setEditName} />
              <View style={styles.editSpacer} />
              <ThemedInput
                label="Description"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
              />
              <View style={styles.editSpacer} />
              <ThemedInput
                label="Default Team Assignment Message"
                value={editMessageTemplate}
                onChangeText={setEditMessageTemplate}
                multiline
                hint={`Pre-fills the message when an admin notifies players of their team. "You're on {team}" is always appended automatically.`}
              />
              <View style={styles.editActions}>
                <ThemedButton
                  title="Cancel"
                  variant="secondary"
                  size="small"
                  onPress={() => setIsEditing(false)}
                />
                <ThemedButton
                  title={isSaving ? 'Saving...' : 'Save'}
                  variant="primary"
                  size="small"
                  onPress={handleSaveEdit}
                  disabled={isSaving || !editName.trim()}
                />
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.titleRow}>
                <ThemedTextBox variant="heading" weight="bold">
                  {group.name}
                </ThemedTextBox>
                {isAdmin && (
                  <ThemedButton title="Edit" variant="ghost" size="small" onPress={startEditing} />
                )}
              </View>
              {group.description && (
                <ThemedTextBox variant="body" color="secondary" style={styles.description}>
                  {group.description}
                </ThemedTextBox>
              )}
            </View>
          )}
        </ThemedCard>

        {isAdmin && (
          <View style={styles.adminActions}>
            <ThemedButton
              title="Invite Player"
              variant="outline"
              onPress={() =>
                onNavigateToInvite(
                  groupId,
                  group.name,
                  members.map((m) => m.user_id)
                )
              }
              style={styles.adminActionButton}
            />
            <ThemedButton
              title="Create Game"
              variant="primary"
              onPress={() => onNavigateToCreateGame(groupId)}
              style={styles.adminActionButton}
            />
          </View>
        )}

        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <ThemedCard variant="elevated" title="Members" style={styles.summaryCardInner}>
              <ThemedTextBox variant="body" color="secondary" style={styles.summaryText}>
                {`${members.length} ${members.length === 1 ? 'member' : 'members'}`}
              </ThemedTextBox>
              <ThemedButton
                title="View Members"
                variant="outline"
                size="small"
                onPress={() => onNavigateToMembers(groupId)}
              />
            </ThemedCard>
          </View>

          <View style={styles.summaryCard}>
            <ThemedCard variant="elevated" title="Upcoming Games" style={styles.summaryCardInner}>
              <ThemedTextBox variant="body" color="secondary" style={styles.summaryText}>
                {upcomingGames.length === 0
                  ? 'No upcoming games'
                  : upcomingGames.length === 1
                    ? `${formatDate(upcomingGames[0].kickoff_date)} at ${formatTime(upcomingGames[0].kickoff_date)}`
                    : `${upcomingGames.length} games scheduled`}
              </ThemedTextBox>
              <ThemedButton
                title={upcomingGames.length === 1 ? 'View Game' : 'View Games'}
                variant="outline"
                size="small"
                onPress={handleUpcomingGamesPress}
                disabled={upcomingGames.length === 0}
              />
            </ThemedCard>
          </View>
        </View>

        <View style={styles.leaveSection}>
          <ThemedButton title="Leave Group" variant="ghost" onPress={handleLeaveGroup} />
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  description: {
    marginTop: 8,
  },
  editSection: {
    gap: 4,
  },
  editSpacer: {
    height: 4,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  adminActions: {
    flexDirection: 'row',
    gap: 12,
  },
  adminActionButton: {
    flex: 1,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
  },
  summaryCardInner: {
    flex: 1,
  },
  summaryText: {
    flexGrow: 1,
    marginBottom: 12,
  },
  leaveSection: {
    alignItems: 'center',
    marginTop: 8,
  },
});
