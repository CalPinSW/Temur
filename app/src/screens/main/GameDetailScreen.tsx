import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  ThemedTextBox,
  ThemedCard,
  ThemedButton,
  ThemedToggle,
  ThemedInput,
} from '@/components/themed';
import { useAuthStore } from '@/store/authStore';
import { useGameDetails } from '@/hooks/useGameDetails';
import { useGameActions } from '@/hooks/useGameActions';
import { useGroupAdminGroupIds } from '@/hooks/useGroupAdminGroupIds';
import { useAcceptedFriends } from '@/hooks/useAcceptedFriends';
import {
  acceptGameInvitation,
  declineGameInvitation,
  inviteFriendsToGame,
} from '@/services/gameInvitationService';
import { notifyTeamAssignments } from '@/services/gameNotificationService';
import { getGroupMessageTemplate } from '@/services/groupService';
import { supabase } from '@/services/supabase';
import {
  getGameCapacity,
  getActivePlayers,
  getWaitlistPlayers,
  getVisiblePlayers,
  isGameAdmin,
} from '@/utils/gameUtils';
import {
  GameHeader,
  GameStats,
  GameActions,
  PlayersList,
  TeamsSection,
  WaitlistSection,
} from '@/components/game';

interface GameDetailScreenProps {
  gameId: string;
  onGoBack: () => void;
  onNavigateToTeamAssignment?: (gameId: string) => void;
}

export function GameDetailScreen({
  gameId,
  onGoBack,
  onNavigateToTeamAssignment,
}: GameDetailScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [isPlayersExpanded, setIsPlayersExpanded] = useState(false);
  const [isRespondingToInvite, setIsRespondingToInvite] = useState(false);
  const [isInviteSectionOpen, setIsInviteSectionOpen] = useState(false);
  const [selectedInviteFriendIds, setSelectedInviteFriendIds] = useState<Set<string>>(new Set());
  const [isInviting, setIsInviting] = useState(false);
  const [isNotifySectionOpen, setIsNotifySectionOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const { game, isLoading, refetch } = useGameDetails(gameId, user?.id);
  const { isSigningUp, isWithdrawing, handleSignUp, handleWithdraw } = useGameActions(
    gameId,
    user?.id
  );
  const { adminGroupIds } = useGroupAdminGroupIds(user?.id);
  const { friends } = useAcceptedFriends(user?.id);

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

  if (!game) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.errorContainer}>
          <ThemedTextBox variant="body" color="secondary">
            Game not found
          </ThemedTextBox>
          <ThemedButton title="Go Back" variant="primary" onPress={onGoBack} />
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin = isGameAdmin(game, user?.id, adminGroupIds);
  const isPast = new Date(game.kickoff_date) < new Date();
  const isVisible = new Date(game.visible_at) <= new Date();
  const hasTeams = game.player_games.some((pg) => pg.team !== null);
  const capacity = getGameCapacity(game.players_per_team);
  const activePlayers = getActivePlayers(game.player_games, capacity);
  const waitlistPlayers = getWaitlistPlayers(game.player_games, capacity);

  const invitableFriends = friends.filter(
    (friend) => !game.player_games.some((pg) => pg.user_id === friend.id)
  );

  const handleAcceptInvite = async () => {
    if (!game.invitation_id || !user) return;

    try {
      setIsRespondingToInvite(true);
      await acceptGameInvitation(game.invitation_id, gameId, user.id, game.player_count);
      refetch();
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', 'Failed to accept invite');
    } finally {
      setIsRespondingToInvite(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!game.invitation_id) return;

    try {
      setIsRespondingToInvite(true);
      await declineGameInvitation(game.invitation_id);
      onGoBack();
    } catch (error) {
      console.error('Error declining invite:', error);
      Alert.alert('Error', 'Failed to decline invite');
    } finally {
      setIsRespondingToInvite(false);
    }
  };

  const toggleInviteFriend = (friendId: string) => {
    setSelectedInviteFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleSendInvites = async () => {
    if (!user || selectedInviteFriendIds.size === 0) return;

    try {
      setIsInviting(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single();
      const inviterName = profile?.display_name || profile?.username || 'Someone';

      await inviteFriendsToGame(gameId, Array.from(selectedInviteFriendIds), user.id, inviterName);
      setSelectedInviteFriendIds(new Set());
      setIsInviteSectionOpen(false);
      Alert.alert('Success', 'Invites sent!');
    } catch (error) {
      console.error('Error inviting friends:', error);
      Alert.alert('Error', 'Failed to send invites');
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleNotifySection = async () => {
    const next = !isNotifySectionOpen;
    setIsNotifySectionOpen(next);

    if (next && !notifyMessage && game.group_id) {
      try {
        setIsLoadingTemplate(true);
        setNotifyMessage((await getGroupMessageTemplate(game.group_id)) || '');
      } catch (error) {
        console.error('Error loading message template:', error);
      } finally {
        setIsLoadingTemplate(false);
      }
    }
  };

  const handleNotifyPlayers = async () => {
    try {
      setIsNotifying(true);
      await notifyTeamAssignments(
        gameId,
        game.player_games,
        game.team1_name,
        game.team2_name,
        notifyMessage.trim()
      );
      setIsNotifySectionOpen(false);
      Alert.alert('Success', 'Players notified!');
    } catch (error) {
      console.error('Error notifying players:', error);
      Alert.alert('Error', 'Failed to notify players');
    } finally {
      setIsNotifying(false);
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {game.invitation_status === 'pending' && (
          <ThemedCard variant="elevated" title="You're Invited">
            <ThemedTextBox variant="body" color="secondary" style={styles.inviteBannerText}>
              You&apos;ve been invited to this game. Accept to sign up.
            </ThemedTextBox>
            <View style={styles.inviteBannerActions}>
              <ThemedButton
                title="Decline"
                variant="secondary"
                onPress={handleDeclineInvite}
                disabled={isRespondingToInvite}
                style={styles.inviteBannerButton}
              />
              <ThemedButton
                title={isRespondingToInvite ? 'Accepting...' : 'Accept'}
                variant="primary"
                onPress={handleAcceptInvite}
                disabled={isRespondingToInvite}
                style={styles.inviteBannerButton}
              />
            </View>
          </ThemedCard>
        )}

        <ThemedCard variant="elevated">
          <GameHeader kickoffDate={game.kickoff_date} isPast={isPast} isVisible={isVisible} />

          <GameStats
            activePlayersCount={activePlayers.length}
            capacity={capacity}
            waitlistCount={waitlistPlayers.length}
          />

          {!isPast && isVisible && game.invitation_status !== 'pending' && (
            <GameActions
              isUserSignedUp={game.user_signed_up}
              isSigningUp={isSigningUp}
              isWithdrawing={isWithdrawing}
              onSignUp={() => handleSignUp(game, refetch)}
              onWithdraw={() => handleWithdraw(game, refetch)}
              isAdmin={isAdmin}
              hasPlayers={game.player_count > 0}
              onNavigateToTeamAssignment={
                onNavigateToTeamAssignment ? () => onNavigateToTeamAssignment(gameId) : undefined
              }
            />
          )}
        </ThemedCard>

        {isAdmin && !game.group_id && (
          <ThemedCard variant="elevated" title="Invite Friends">
            <ThemedButton
              title={isInviteSectionOpen ? 'Hide' : 'Invite More Friends'}
              variant="outline"
              onPress={() => setIsInviteSectionOpen(!isInviteSectionOpen)}
            />
            {isInviteSectionOpen && (
              <View style={styles.inviteSection}>
                {invitableFriends.length === 0 ? (
                  <ThemedTextBox variant="body" color="secondary" style={styles.inviteSectionText}>
                    All your friends are already signed up, or you have no friends to invite.
                  </ThemedTextBox>
                ) : (
                  invitableFriends.map((friend) => (
                    <View key={friend.id} style={styles.friendRow}>
                      <ThemedToggle
                        label={friend.display_name || friend.username}
                        value={selectedInviteFriendIds.has(friend.id)}
                        onValueChange={() => toggleInviteFriend(friend.id)}
                      />
                    </View>
                  ))
                )}
                {invitableFriends.length > 0 && (
                  <ThemedButton
                    title={isInviting ? 'Sending...' : 'Send Invites'}
                    variant="primary"
                    onPress={handleSendInvites}
                    disabled={isInviting || selectedInviteFriendIds.size === 0}
                    style={styles.sendInvitesButton}
                  />
                )}
              </View>
            )}
          </ThemedCard>
        )}

        {activePlayers.length > 0 && (
          <ThemedCard variant="elevated" title={hasTeams ? 'Teams' : 'Players'}>
            {hasTeams ? (
              <TeamsSection
                players={game.player_games}
                capacity={capacity}
                team1Name={game.team1_name}
                team2Name={game.team2_name}
                currentUserId={user?.id}
                isExpanded={isPlayersExpanded}
                onToggleExpand={() => setIsPlayersExpanded(!isPlayersExpanded)}
              />
            ) : (
              <PlayersList
                players={getVisiblePlayers(
                  game.player_games,
                  capacity,
                  isPlayersExpanded,
                  user?.id,
                  undefined,
                  false
                )}
                currentUserId={user?.id}
                isExpanded={isPlayersExpanded}
                onToggleExpand={() => setIsPlayersExpanded(!isPlayersExpanded)}
              />
            )}
          </ThemedCard>
        )}

        {isAdmin && hasTeams && (
          <ThemedCard variant="elevated" title="Notify Players">
            <ThemedButton
              title={isNotifySectionOpen ? 'Hide' : 'Notify Players of Teams'}
              variant="outline"
              onPress={handleToggleNotifySection}
            />
            {isNotifySectionOpen && (
              <View style={styles.notifySection}>
                <ThemedInput
                  label="Message"
                  value={notifyMessage}
                  onChangeText={setNotifyMessage}
                  multiline
                  placeholder="Add a message for players..."
                  editable={!isLoadingTemplate}
                />
                <ThemedTextBox variant="caption" color="secondary" style={styles.notifyHint}>
                  {`Each player's team is added automatically, e.g. "You're on ${game.team1_name}".`}
                </ThemedTextBox>
                <ThemedButton
                  title={isNotifying ? 'Sending...' : 'Send Notifications'}
                  variant="primary"
                  onPress={handleNotifyPlayers}
                  disabled={isNotifying || isLoadingTemplate}
                  style={styles.sendInvitesButton}
                />
              </View>
            )}
          </ThemedCard>
        )}

        {waitlistPlayers.length > 0 && (
          <ThemedCard variant="elevated" title="Waitlist">
            <WaitlistSection
              players={game.player_games}
              capacity={capacity}
              currentUserId={user?.id}
              isExpanded={isPlayersExpanded}
              onToggleExpand={() => setIsPlayersExpanded(!isPlayersExpanded)}
            />
          </ThemedCard>
        )}
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
  inviteBannerText: {
    marginBottom: 12,
  },
  inviteBannerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteBannerButton: {
    flex: 1,
  },
  inviteSection: {
    marginTop: 12,
  },
  inviteSectionText: {
    marginTop: 8,
  },
  friendRow: {
    paddingVertical: 8,
  },
  sendInvitesButton: {
    marginTop: 12,
  },
  notifySection: {
    marginTop: 12,
  },
  notifyHint: {
    marginTop: 8,
  },
});
