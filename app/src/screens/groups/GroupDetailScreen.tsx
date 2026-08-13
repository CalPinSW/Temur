import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  ThemedButton,
  ThemedTextBox,
  ThemedCard,
  ThemedInput,
  ThemedBadge,
} from '@/components/themed';
import { useAuthStore } from '@/store/authStore';
import { useGroupDetails } from '@/hooks/useGroupDetails';
import { updateGroup, updateMemberRole, removeMember, leaveGroup } from '@/services/groupService';
import { GroupMemberWithProfile } from '@/types/group';

interface GroupDetailScreenProps {
  groupId: string;
  onGoBack: () => void;
  onNavigateToInvite: (groupId: string, groupName: string, existingMemberIds: string[]) => void;
  onNavigateToCreateGame: (groupId: string) => void;
}

export function GroupDetailScreen({
  groupId,
  onGoBack,
  onNavigateToInvite,
  onNavigateToCreateGame,
}: GroupDetailScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { group, members, isLoading, refetch } = useGroupDetails(groupId);
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

  const handleToggleRole = async (member: GroupMemberWithProfile) => {
    const nextRole = member.role === 'admin' ? 'member' : 'admin';
    try {
      await updateMemberRole(member.id, nextRole);
      refetch();
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const handleRemoveMember = (member: GroupMemberWithProfile) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.profile.display_name || member.profile.username} from ${group.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(member.id);
              refetch();
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
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

  const getInitials = (member: GroupMemberWithProfile) => {
    if (member.profile.display_name) {
      return member.profile.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return member.profile.username?.slice(0, 2).toUpperCase() || '??';
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <ThemedButton title="← Back" variant="ghost" onPress={onGoBack} style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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

        <ThemedCard variant="elevated" title="Members">
          {members.map((member) => (
            <View key={member.id} style={[styles.memberItem, { borderBottomColor: colors.border }]}>
              {member.profile.avatar_url ? (
                <Image source={{ uri: member.profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{getInitials(member)}</Text>
                </View>
              )}
              <View style={styles.memberInfo}>
                <ThemedTextBox variant="body" weight="semibold">
                  {member.profile.display_name || member.profile.username}
                </ThemedTextBox>
                <ThemedTextBox variant="caption" color="secondary">
                  {`@${member.profile.username}`}
                </ThemedTextBox>
              </View>
              {member.role === 'admin' && <ThemedBadge text="Admin" variant="info" />}
              {isAdmin && member.user_id !== user?.id && (
                <View style={styles.memberActions}>
                  <ThemedButton
                    title={member.role === 'admin' ? 'Demote' : 'Promote'}
                    variant="secondary"
                    size="small"
                    onPress={() => handleToggleRole(member)}
                  />
                  <ThemedButton
                    title="Remove"
                    variant="ghost"
                    size="small"
                    onPress={() => handleRemoveMember(member)}
                  />
                </View>
              )}
            </View>
          ))}
        </ThemedCard>

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
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberActions: {
    flexDirection: 'column',
    gap: 4,
  },
  leaveSection: {
    alignItems: 'center',
    marginTop: 8,
  },
});
