import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { Profile } from '@/types/auth';
import { NotificationTemplates } from '@/services/notificationService';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox, ThemedInput } from '@/components/themed';

interface SearchUsersScreenProps {
  onGoBack: () => void;
}

export function SearchUsersScreen({ onGoBack }: SearchUsersScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim() || !user) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .neq('id', user.id)
          .limit(20);

        if (error) throw error;
        setResults(data as Profile[]);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    },
    [user]
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      searchUsers(text);
    } else {
      setResults([]);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('friendships').insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already Sent', 'You already sent a friend request to this user.');
        } else {
          throw error;
        }
      } else {
        setSentRequests((prev) => new Set(prev).add(friendId));
        Alert.alert('Success', 'Friend request sent!');

        // Send push notification to the friend
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .single();

        const senderName = profile?.display_name || profile?.username || 'Someone';
        const notification = NotificationTemplates.friendRequest(senderName);

        await supabase.functions.invoke('send-notification', {
          body: {
            userId: friendId,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            data: notification.data,
          },
        });
      }
    } catch (error) {
      console.error('Send request error:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

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

  const renderUser = ({ item }: { item: Profile }) => {
    const hasSentRequest = sentRequests.has(item.id);

    return (
      <View style={[styles.userItem, { borderBottomColor: colors.border }]}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{getInitials(item)}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <ThemedTextBox variant="body" weight="semibold">
            {item.display_name || item.username || ''}
          </ThemedTextBox>
          <ThemedTextBox variant="caption" color="secondary">
            {`@${item.username}`}
          </ThemedTextBox>
        </View>
        <ThemedButton
          title={hasSentRequest ? 'Sent' : 'Add'}
          variant={hasSentRequest ? 'secondary' : 'primary'}
          size="small"
          onPress={() => sendFriendRequest(item.id)}
          disabled={hasSentRequest}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (searchQuery.length < 2) {
      return (
        <View style={styles.emptyContainer}>
          <ThemedTextBox variant="subheading" weight="semibold" align="center">
            Search for users
          </ThemedTextBox>
          <View style={styles.emptySubtextContainer}>
            <ThemedTextBox variant="body" color="secondary" align="center">
              Enter at least 2 characters to search
            </ThemedTextBox>
          </View>
        </View>
      );
    }

    if (isSearching) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <ThemedTextBox variant="subheading" weight="semibold" align="center">
          No users found
        </ThemedTextBox>
        <View style={styles.emptySubtextContainer}>
          <ThemedTextBox variant="body" color="secondary" align="center">
            Try a different search term
          </ThemedTextBox>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton variant="ghost" onPress={onGoBack} title="← Back" />
        <ThemedTextBox variant="subheading" weight="semibold">
          Find Friends
        </ThemedTextBox>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <ThemedInput
            placeholder="Search by username or name..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {isSearching && <ActivityIndicator style={styles.searchIndicator} color={colors.primary} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={results.length === 0 ? styles.emptyList : styles.list}
      />
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
  placeholder: {
    width: 50,
  },
  searchContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIndicator: {
    marginLeft: 12,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  userItem: {
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
  userInfo: {
    marginLeft: 12,
    flex: 1,
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
  searchInputWrapper: {
    flex: 1,
  },
});
