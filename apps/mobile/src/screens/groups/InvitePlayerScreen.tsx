import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { Profile } from '@temur/shared';
import { inviteToGroup, getOrCreateGroupJoinLink } from '@/services/groupService';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox, ThemedInput } from '@/components/themed';
import * as Sentry from '@sentry/react-native';

interface InvitePlayerScreenProps {
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
  onGoBack: () => void;
}

export function InvitePlayerScreen({
  groupId,
  groupName,
  existingMemberIds,
  onGoBack,
}: InvitePlayerScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  const handleCopyJoinLink = async () => {
    setIsCopyingLink(true);
    try {
      const link = await getOrCreateGroupJoinLink(groupId);
      await Clipboard.setStringAsync(link);
      Alert.alert(
        'Link Copied',
        'Join link copied to clipboard. Anyone with this link can join the group for the next 7 days.'
      );
    } catch (error) {
      console.error('Copy join link error:', error);
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to create join link');
    } finally {
      setIsCopyingLink(false);
    }
  };

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
        const filtered = ((data as Profile[]) || []).filter(
          (profile) => !existingMemberIds.includes(profile.id)
        );
        setResults(filtered);
      } catch (error) {
        console.error('Search error:', error);
        Sentry.captureException(error);
      } finally {
        setIsSearching(false);
      }
    },
    [user, existingMemberIds]
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      searchUsers(text);
    } else {
      setResults([]);
    }
  };

  const sendInvite = async (invitedUserId: string) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single();
      const senderName = profile?.display_name || profile?.username || 'Someone';

      await inviteToGroup(groupId, invitedUserId, user.id, groupName, senderName);
      setSentInvites((prev) => new Set(prev).add(invitedUserId));
      Alert.alert('Success', 'Invite sent!');
    } catch (error) {
      console.error('Send invite error:', error);
      Sentry.captureException(error);
      if ((error as { code?: string }).code === '23505') {
        Alert.alert('Already Sent', 'You already invited this player to the group.');
      } else {
        Alert.alert('Error', 'Failed to send invite');
      }
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
    const hasSentInvite = sentInvites.has(item.id);

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
          title={hasSentInvite ? 'Sent' : 'Invite'}
          variant={hasSentInvite ? 'secondary' : 'primary'}
          size="small"
          onPress={() => sendInvite(item.id)}
          disabled={hasSentInvite}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (searchQuery.length < 2) {
      return (
        <View style={styles.emptyContainer}>
          <ThemedTextBox variant="subheading" weight="semibold" align="center">
            Search for players
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
          No players found
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
          Invite Players
        </ThemedTextBox>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.joinLinkContainer}>
        <ThemedButton
          title={isCopyingLink ? 'Copying…' : 'Copy Join Link'}
          variant="outline"
          onPress={handleCopyJoinLink}
          disabled={isCopyingLink}
        />
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
  joinLinkContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
