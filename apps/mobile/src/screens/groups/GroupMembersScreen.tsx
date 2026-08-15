import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox, ThemedInput, ThemedBadge } from '@/components/themed';
import { useAuthStore } from '@/store/authStore';
import { useGroupDetails } from '@/hooks/useGroupDetails';
import { updateMemberRole, removeMember } from '@/services/groupService';
import { GroupMemberWithProfile } from '@temur/shared';

interface GroupMembersScreenProps {
  groupId: string;
  onGoBack: () => void;
}

export function GroupMembersScreen({ groupId, onGoBack }: GroupMembersScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { group, members, isLoading, refetch } = useGroupDetails(groupId);
  const [searchQuery, setSearchQuery] = useState('');

  const myMembership = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMembership?.role === 'admin';

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      member.profile.username?.toLowerCase().includes(query) ||
      member.profile.display_name?.toLowerCase().includes(query)
    );
  });

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
      `Remove ${member.profile.display_name || member.profile.username} from ${group?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(member.id, member.group_id, member.user_id);
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

  const renderMember = ({ item: member }: { item: GroupMemberWithProfile }) => {
    const isCurrentUser = member.user_id === user?.id;

    return (
      <View
        style={[
          styles.memberItem,
          { borderBottomColor: colors.border },
          isCurrentUser && { backgroundColor: colors.backgroundTertiary },
        ]}
      >
        {member.profile.avatar_url ? (
          <Image source={{ uri: member.profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{getInitials(member)}</Text>
          </View>
        )}
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <ThemedTextBox variant="body" weight="semibold">
              {member.profile.display_name || member.profile.username}
            </ThemedTextBox>
            {isCurrentUser && <ThemedBadge variant="info" text="You" />}
          </View>
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
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedTextBox variant="subheading" weight="semibold" align="center">
        No members found
      </ThemedTextBox>
      <View style={styles.emptySubtextContainer}>
        <ThemedTextBox variant="body" color="secondary" align="center">
          Try a different search term
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
        <ThemedTextBox variant="subheading" weight="semibold">
          Members
        </ThemedTextBox>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <ThemedInput
          placeholder="Search by username or name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={filteredMembers.length === 0 ? styles.emptyList : styles.list}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
