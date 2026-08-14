import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  ThemedTextBox,
  ThemedCard,
  ThemedButton,
  ThemedToggle,
  ThemedInput,
  ThemedBadge,
} from '@/components/themed';
import { useAuthStore } from '@/store/authStore';
import { useGameDetails } from '@/hooks/useGameDetails';
import { useGameActions } from '@/hooks/useGameActions';
import { useRingerActions } from '@/hooks/useRingerActions';
import { useGroupAdminGroupIds } from '@/hooks/useGroupAdminGroupIds';
import { useAcceptedFriends } from '@/hooks/useAcceptedFriends';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import {
  acceptGameInvitation,
  declineGameInvitation,
  inviteFriendsToGame,
} from '@/services/gameInvitationService';
import {
  notifyTeamAssignments,
  notifyGroupMembersRingersOpen,
} from '@/services/gameNotificationService';
import { getGroupMessageTemplate } from '@/services/groupService';
import { openGameToRingers, getSavedRingers } from '@/services/ringerService';
import { supabase } from '@/services/supabase';
import { SavedRinger } from '@/types/game';
import {
  getGameCapacity,
  getActivePlayers,
  getWaitlistPlayers,
  getVisiblePlayers,
  getNextSignupOrder,
  isGameAdmin,
  formatGameResult,
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
  onNavigateToGameResult?: (gameId: string) => void;
}

export function GameDetailScreen({
  gameId,
  onGoBack,
  onNavigateToTeamAssignment,
  onNavigateToGameResult,
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
  const [isRingersSectionOpen, setIsRingersSectionOpen] = useState(false);
  const [ringersMessage, setRingersMessage] = useState(
    'This game is now open to ringers — add one if you know someone who can play!'
  );
  const [isOpeningRingers, setIsOpeningRingers] = useState(false);
  const [isAddRingerSectionOpen, setIsAddRingerSectionOpen] = useState(false);
  const [ringerNameInput, setRingerNameInput] = useState('');
  const [savedRingers, setSavedRingers] = useState<SavedRinger[]>([]);
  const [isLoadingSavedRingers, setIsLoadingSavedRingers] = useState(false);

  const { game, isLoading, refetch } = useGameDetails(gameId, user?.id);
  const { isSigningUp, isWithdrawing, handleSignUp, handleWithdraw } = useGameActions(
    gameId,
    user?.id
  );
  const { isAddingRinger, handleAddRinger, handleRemoveRinger } = useRingerActions(
    gameId,
    user?.id
  );
  const { adminGroupIds } = useGroupAdminGroupIds(user?.id);
  const { friends } = useAcceptedFriends(user?.id);
  const { refreshing, onRefresh } = useRefreshControl(refetch);

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
      await acceptGameInvitation(
        game.invitation_id,
        gameId,
        user.id,
        getNextSignupOrder(game.player_games)
      );
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

  const handleOpenRingers = async () => {
    if (!user || !game.group_id) return;

    try {
      setIsOpeningRingers(true);
      await openGameToRingers(gameId, user.id);
      await notifyGroupMembersRingersOpen(gameId, game.group_id, ringersMessage.trim());
      setIsRingersSectionOpen(false);
      Alert.alert('Success', 'Group notified that this game is open to ringers!');
      refetch();
    } catch (error) {
      console.error('Error opening game to ringers:', error);
      Alert.alert('Error', 'Failed to open game to ringers');
    } finally {
      setIsOpeningRingers(false);
    }
  };

  const handleToggleAddRingerSection = async () => {
    const next = !isAddRingerSectionOpen;
    setIsAddRingerSectionOpen(next);

    if (next && user) {
      try {
        setIsLoadingSavedRingers(true);
        setSavedRingers(await getSavedRingers(user.id));
      } catch (error) {
        console.error('Error loading saved ringers:', error);
      } finally {
        setIsLoadingSavedRingers(false);
      }
    }
  };

  const handleSubmitAddRinger = () => {
    handleAddRinger(ringerNameInput, getNextSignupOrder(game.player_games), () => {
      setRingerNameInput('');
      setIsAddRingerSectionOpen(false);
      refetch();
    });
  };

  const handleRemoveRingerPress = (playerGameId: string, ringerName: string) => {
    handleRemoveRinger(playerGameId, ringerName, refetch);
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

          {isPast && (
            <View style={styles.resultSection}>
              <ThemedTextBox variant="body" color="secondary">
                {formatGameResult(
                  game.team1_name,
                  game.team2_name,
                  game.result_team1_score,
                  game.result_team2_score,
                  game.result_outcome
                ) || 'No result entered yet'}
              </ThemedTextBox>
              {onNavigateToGameResult && (
                <ThemedButton
                  title={
                    game.result_outcome || game.result_team1_score !== null
                      ? 'View / Edit Result'
                      : 'Enter Result'
                  }
                  variant="outline"
                  onPress={() => onNavigateToGameResult(gameId)}
                  style={styles.resultButton}
                />
              )}
            </View>
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
                isAdmin={isAdmin}
                onRemoveRinger={handleRemoveRingerPress}
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
                isAdmin={isAdmin}
                onRemoveRinger={handleRemoveRingerPress}
              />
            )}
          </ThemedCard>
        )}

        {!!game.group_id && !!game.ringers_opened_at && !isPast && (
          <ThemedCard variant="elevated" title="Add Ringer">
            <ThemedButton
              title={isAddRingerSectionOpen ? 'Hide' : 'Add a Ringer'}
              variant="outline"
              onPress={handleToggleAddRingerSection}
            />
            {isAddRingerSectionOpen && (
              <View style={styles.notifySection}>
                <ThemedInput
                  label="Ringer's name"
                  value={ringerNameInput}
                  onChangeText={setRingerNameInput}
                  placeholder="e.g. Alex Smith"
                />
                {!isLoadingSavedRingers && savedRingers.length > 0 && (
                  <View style={styles.savedRingersRow}>
                    {savedRingers.map((ringer) => (
                      <TouchableOpacity
                        key={ringer.id}
                        onPress={() => setRingerNameInput(ringer.name)}
                      >
                        <ThemedBadge variant="default" text={ringer.name} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <ThemedButton
                  title={isAddingRinger ? 'Adding...' : 'Add Ringer'}
                  variant="primary"
                  onPress={handleSubmitAddRinger}
                  disabled={isAddingRinger || !ringerNameInput.trim()}
                  style={styles.sendInvitesButton}
                />
              </View>
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

        {isAdmin && !!game.group_id && (
          <ThemedCard variant="elevated" title="Ringers">
            {game.ringers_opened_at ? (
              <ThemedBadge variant="info" text="Open to ringers" />
            ) : (
              <>
                <ThemedButton
                  title={isRingersSectionOpen ? 'Hide' : 'Open to Ringers'}
                  variant="outline"
                  onPress={() => setIsRingersSectionOpen(!isRingersSectionOpen)}
                />
                {isRingersSectionOpen && (
                  <View style={styles.notifySection}>
                    <ThemedInput
                      label="Message"
                      value={ringersMessage}
                      onChangeText={setRingersMessage}
                      multiline
                    />
                    <ThemedTextBox variant="caption" color="secondary" style={styles.notifyHint}>
                      Every group member will get a push notification with this message.
                    </ThemedTextBox>
                    <ThemedButton
                      title={isOpeningRingers ? 'Sending...' : 'Send Notifications'}
                      variant="primary"
                      onPress={handleOpenRingers}
                      disabled={isOpeningRingers}
                      style={styles.sendInvitesButton}
                    />
                  </View>
                )}
              </>
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
              isAdmin={isAdmin}
              onRemoveRinger={handleRemoveRingerPress}
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
  resultSection: {
    marginTop: 12,
    gap: 8,
  },
  resultButton: {
    alignSelf: 'flex-start',
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
  savedRingersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
});
