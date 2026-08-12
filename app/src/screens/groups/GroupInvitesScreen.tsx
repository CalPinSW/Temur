import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useGroupInvitations } from '@/hooks/useGroupInvitations';
import { acceptGroupInvitation, declineGroupInvitation } from '@/services/groupService';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox } from '@/components/themed';
import { GroupInvitationWithDetails } from '@/types/group';

interface GroupInvitesScreenProps {
  onGoBack: () => void;
}

export function GroupInvitesScreen({ onGoBack }: GroupInvitesScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { invitations, isLoading, refetch } = useGroupInvitations(user?.id);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (invitation: GroupInvitationWithDetails) => {
    if (!user) return;

    try {
      setProcessingId(invitation.id);
      await acceptGroupInvitation(invitation.id, invitation.group_id, user.id);
      Alert.alert('Success', `You've joined ${invitation.group.name}!`);
      refetch();
    } catch (error) {
      console.error('Accept invite error:', error);
      Alert.alert('Error', 'Failed to accept invite');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: GroupInvitationWithDetails) => {
    try {
      setProcessingId(invitation.id);
      await declineGroupInvitation(invitation.id);
      refetch();
    } catch (error) {
      console.error('Decline invite error:', error);
      Alert.alert('Error', 'Failed to decline invite');
    } finally {
      setProcessingId(null);
    }
  };

  const renderInvitation = ({ item }: { item: GroupInvitationWithDetails }) => (
    <View style={[styles.inviteItem, { borderBottomColor: colors.border }]}>
      <View style={styles.inviteInfo}>
        <ThemedTextBox variant="body" weight="semibold">
          {item.group.name}
        </ThemedTextBox>
        <ThemedTextBox variant="caption" color="secondary">
          {`Invited by ${item.inviter.display_name || item.inviter.username}`}
        </ThemedTextBox>
      </View>
      <View style={styles.actions}>
        <ThemedButton
          title="Accept"
          variant="primary"
          size="small"
          onPress={() => handleAccept(item)}
          disabled={processingId === item.id}
        />
        <ThemedButton
          title="✕"
          variant="secondary"
          size="small"
          onPress={() => handleDecline(item)}
          disabled={processingId === item.id}
        />
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedTextBox variant="subheading" weight="semibold" align="center">
        No pending invites
      </ThemedTextBox>
      <View style={styles.emptySubtextContainer}>
        <ThemedTextBox variant="body" color="secondary" align="center">
          When someone invites you to a group, it will appear here
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
          Group Invites
        </ThemedTextBox>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id}
          renderItem={renderInvitation}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={invitations.length === 0 ? styles.emptyList : styles.list}
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
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  inviteInfo: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
