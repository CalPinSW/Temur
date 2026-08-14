import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedButton, ThemedBadge } from '@/components/themed';
import { PlayerGameWithProfile } from '@/types/game';
import { getPlayerDisplayName } from '@/utils/gameUtils';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface PlayersListProps {
  players: PlayerGameWithProfile[];
  currentUserId?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isAdmin?: boolean;
  onRemoveRinger?: (playerGameId: string) => void;
}

export function PlayersList({
  players,
  currentUserId,
  isExpanded,
  onToggleExpand,
  isAdmin,
  onRemoveRinger,
}: PlayersListProps) {
  const { colors } = useTheme();

  if (players.length === 0) return null;

  const visiblePlayers = isExpanded || players.length <= 5 ? players : players.slice(0, 5);
  const showExpandButton = players.length > 5;
  const firstVisibleIndex = players.indexOf(visiblePlayers[0]);

  return (
    <View>
      <View style={styles.playersList}>
        {visiblePlayers.map((playerGame, index) => {
          const actualIndex = firstVisibleIndex + index;
          const isCurrentUser = playerGame.user_id === currentUserId;

          return (
            <View
              key={playerGame.id}
              style={[
                styles.playerItem,
                { borderBottomColor: colors.border },
                isCurrentUser && { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <View style={styles.playerInfo}>
                <View style={styles.playerNameContainer}>
                  <ThemedTextBox
                    variant="body"
                    color="primary"
                    weight={isCurrentUser ? 'semibold' : 'medium'}
                  >
                    {`${actualIndex + 1}. ${getPlayerDisplayName(playerGame)}`}
                  </ThemedTextBox>
                  {isCurrentUser && <ThemedBadge variant="info" text="You" />}
                  {playerGame.is_ringer && <ThemedBadge variant="warning" text="Ringer" />}
                </View>
                {playerGame.average_rating !== undefined && (
                  <View style={styles.ratingContainer}>
                    <MaterialIcons name="star" size={16} color="#FBBF24" />
                    <ThemedTextBox variant="caption" color="secondary">
                      {`${playerGame.average_rating.toFixed(1)} (${playerGame.rating_count})`}
                    </ThemedTextBox>
                  </View>
                )}
              </View>
              {playerGame.is_ringer &&
                onRemoveRinger &&
                (playerGame.added_by === currentUserId || isAdmin) && (
                  <TouchableOpacity
                    style={[styles.removeButton, { borderColor: colors.border }]}
                    onPress={() => onRemoveRinger(playerGame.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
            </View>
          );
        })}
      </View>
      {showExpandButton && (
        <ThemedButton
          title={isExpanded ? 'Show Less' : `Show All ${players.length} Players`}
          variant="ghost"
          onPress={onToggleExpand}
          style={styles.expandButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  playersList: {
    gap: 0,
  },
  playerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandButton: {
    marginTop: 8,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
