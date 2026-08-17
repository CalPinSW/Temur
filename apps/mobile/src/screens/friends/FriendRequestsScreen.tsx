import React, { useEffect, useState, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { Profile } from '@temur/shared';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox } from '@/components/themed';
import { NotificationTemplates } from '@/services/notificationService';

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  requester: Profile;
}

interface FriendRequestsScreenProps {
  onGoBack: () => void;
}

export function FriendRequestsScreen({ onGoBack }: FriendRequestsScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(
          `
          id,
          user_id,
          friend_id,
          status,
          created_at,
          requester:profiles!friendships_user_id_fkey(*)
        `
        )
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: { requester: unknown[] | unknown }) => ({
        ...item,
        requester: Array.isArray(item.requester) ? item.requester[0] : item.requester,
      }));

      setRequests(formattedData as FriendRequest[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      Sentry.captureException(error);
    }
  }, [user]);

  const { refreshing: isRefreshing, onRefresh: handleRefresh } = useRefreshControl(fetchRequests);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await fetchRequests();
      setIsLoading(false);
    }
    loadData();
  }, [fetchRequests]);

  const acceptRequest = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      Alert.alert('Success', 'Friend request accepted!');

      if (request) {
        const accepterName = profile?.display_name || profile?.username || 'Someone';
        const notification = NotificationTemplates.friendAccepted(accepterName);
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: request.user_id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            data: notification.data,
          },
        });
      }
    } catch (error) {
      console.error('Accept error:', error);
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', requestId);

      if (error) throw error;

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error('Decline error:', error);
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to decline request');
    }
  };

  const getInitials = (profile: Profile) => {
    if (profile?.display_name) {
      return profile.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile?.username?.slice(0, 2).toUpperCase() || '??';
  };

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={[styles.requestItem, { borderBottomColor: colors.border }]}>
      {item.requester?.avatar_url ? (
        <Image source={{ uri: item.requester.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{getInitials(item.requester)}</Text>
        </View>
      )}
      <View style={styles.requestInfo}>
        <ThemedTextBox variant="body" weight="semibold">
          {item.requester?.display_name || item.requester?.username || ''}
        </ThemedTextBox>
        <ThemedTextBox variant="caption" color="secondary">
          {`@${item.requester?.username}`}
        </ThemedTextBox>
      </View>
      <View style={styles.actions}>
        <ThemedButton
          title="Accept"
          variant="primary"
          size="small"
          onPress={() => acceptRequest(item.id)}
        />
        <ThemedButton
          title="✕"
          variant="secondary"
          size="small"
          onPress={() => declineRequest(item.id)}
        />
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedTextBox variant="subheading" weight="semibold" align="center">
        No pending requests
      </ThemedTextBox>
      <View style={styles.emptySubtextContainer}>
        <ThemedTextBox variant="body" color="secondary" align="center">
          When someone sends you a friend request, it will appear here
        </ThemedTextBox>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <ThemedButton variant="ghost" onPress={onGoBack} title="← Back" />
          <ThemedTextBox variant="heading">Friend Requests</ThemedTextBox>
          <View style={styles.placeholder} />
        </View>
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
        <ThemedButton variant="ghost" onPress={onGoBack} title="← Back" />
        <Text style={[styles.title, { color: colors.text }]}>Friend Requests</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={requests.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primaryHover}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requestInfo: {
    marginLeft: 12,
    flex: 1,
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
