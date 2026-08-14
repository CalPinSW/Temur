import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { Profile } from '@/types/auth';
import { EmptyState } from '@/components';
import { removeFriend } from '@/services/friendshipService';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedBadge, ThemedButton } from '@/components/themed';

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend: Profile;
}

interface FriendsScreenProps {
  onNavigateToSearch: () => void;
  onNavigateToRequests: () => void;
  onNavigateToRingers: () => void;
}

export function FriendsScreen({
  onNavigateToSearch,
  onNavigateToRequests,
  onNavigateToRingers,
}: FriendsScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      // Query friendships where I am the user_id (I sent the request)
      const { data: sentData, error: sentError } = await supabase
        .from('friendships')
        .select(
          `
          id,
          user_id,
          friend_id,
          status,
          created_at,
          friend:profiles!friendships_friend_id_fkey(*)
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (sentError) throw sentError;

      // Query friendships where I am the friend_id (I received/accepted the request)
      const { data: receivedData, error: receivedError } = await supabase
        .from('friendships')
        .select(
          `
          id,
          user_id,
          friend_id,
          status,
          created_at,
          friend:profiles!friendships_user_id_fkey(*)
        `
        )
        .eq('friend_id', user.id)
        .eq('status', 'accepted');

      if (receivedError) throw receivedError;

      // Format sent friendships (friend is in friend_id)
      const sentFormatted = (sentData || []).map((item: { friend: unknown[] | unknown }) => ({
        ...item,
        friend: Array.isArray(item.friend) ? item.friend[0] : item.friend,
      }));

      // Format received friendships (friend is in user_id, so we use the 'friend' field which points to user_id)
      const receivedFormatted = (receivedData || []).map(
        (item: { friend: unknown[] | unknown }) => ({
          ...item,
          friend: Array.isArray(item.friend) ? item.friend[0] : item.friend,
        })
      );

      // Combine and deduplicate by friend id
      const allFriends = [...sentFormatted, ...receivedFormatted];
      const uniqueFriends = allFriends.filter(
        (friend, index, self) => index === self.findIndex((f) => f.friend?.id === friend.friend?.id)
      );

      setFriends(uniqueFriends as Friendship[]);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  }, [user]);

  const fetchPendingCount = useCallback(async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchFriends(), fetchPendingCount()]);
    setIsLoading(false);
  }, [fetchFriends, fetchPendingCount]);

  const refreshData = useCallback(
    () => Promise.all([fetchFriends(), fetchPendingCount()]),
    [fetchFriends, fetchPendingCount]
  );
  const { refreshing: isRefreshing, onRefresh: handleRefresh } = useRefreshControl(refreshData);

  const handleRemoveFriend = (friendship: Friendship) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendship.friend.display_name || friendship.friend.username} as a friend?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(user!.id, friendship.friend_id);
              setFriends((prev) => prev.filter((f) => f.id !== friendship.id));
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend. Please try again.');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getInitials = (profile: Profile) => {
    if (profile.display_name) {
      return profile.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile.username?.slice(0, 2).toUpperCase() || '??';
  };

  const renderFriend = ({ item }: { item: Friendship }) => (
    <TouchableOpacity
      style={[styles.friendItem, { borderBottomColor: colors.border }]}
      onLongPress={() => handleRemoveFriend(item)}
      delayLongPress={500}
    >
      {item.friend.avatar_url ? (
        <Image source={{ uri: item.friend.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{getInitials(item.friend)}</Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <ThemedTextBox variant="body" weight="semibold">
          {item.friend.display_name || item.friend.username || ''}
        </ThemedTextBox>
        <ThemedTextBox variant="caption" color="secondary">
          {`@${item.friend.username}`}
        </ThemedTextBox>
      </View>
      <ThemedButton
        variant="ghost"
        style={styles.removeButton}
        onPress={() => handleRemoveFriend(item)}
        title="✕"
      />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="👥"
      title="No friends yet"
      message="Search for users to add them as friends"
      actionLabel="Find Friends"
      onAction={onNavigateToSearch}
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
          Friends
        </ThemedTextBox>
        <ThemedButton
          variant="ghost"
          onPress={onNavigateToSearch}
          title="+"
          textStyle={styles.addIcon}
        />
      </View>

      {pendingCount > 0 && (
        <TouchableOpacity
          style={[styles.requestsBanner, { backgroundColor: colors.backgroundTertiary }]}
          onPress={onNavigateToRequests}
        >
          <View style={styles.requestsBannerContent}>
            <ThemedBadge text={`${pendingCount}`} variant="info" />
            <ThemedTextBox variant="body" weight="semibold">
              {`pending friend request${pendingCount > 1 ? 's' : ''}`}
            </ThemedTextBox>
          </View>
          <Text style={[styles.requestsArrow, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.requestsBanner, { backgroundColor: colors.backgroundTertiary }]}
        onPress={onNavigateToRingers}
      >
        <View style={styles.requestsBannerContent}>
          <ThemedTextBox variant="body" weight="semibold">
            Manage saved ringers
          </ThemedTextBox>
        </View>
        <Text style={[styles.requestsArrow, { color: colors.primary }]}>›</Text>
      </TouchableOpacity>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={renderFriend}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={friends.length === 0 ? styles.emptyList : styles.list}
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
  requestsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  requestsBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestsArrow: {
    fontSize: 20,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  friendInfo: {
    marginLeft: 12,
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
});
