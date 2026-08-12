import { GameWithPlayers } from '@/types/game';
import { formatDate, formatTime } from '@/utils/gameUtils';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { ThemedCard, ThemedTextBox, ThemedBadge } from '../themed';
import { useTheme } from '@/theme';

interface GameOverviewCardProps {
  game: GameWithPlayers;
  onNavigateToGame: (gameId: string) => void;
}

export const GameOverviewCard: React.FC<GameOverviewCardProps> = ({ game, onNavigateToGame }) => {
  const { colors } = useTheme();

  const isPast = new Date(game.kickoff_date) < new Date();
  const isVisible = new Date(game.visible_at) <= new Date();

  return (
    <TouchableOpacity
      key={game.id}
      onPress={() => onNavigateToGame(game.id)}
      activeOpacity={0.7}
      style={styles.gameCardTouchable}
    >
      <ThemedCard variant="elevated">
        <View style={styles.gameCardHeader}>
          <View style={styles.gameCardDateContainer}>
            <MaterialIcons
              name="event"
              size={20}
              color={isPast ? colors.textSecondary : colors.primary}
            />
            <View style={styles.gameCardDateText}>
              <ThemedTextBox variant="subheading" weight="semibold" color="primary">
                {formatDate(game.kickoff_date)}
              </ThemedTextBox>
              <ThemedTextBox variant="caption" color="secondary">
                {formatTime(game.kickoff_date)}
              </ThemedTextBox>
            </View>
          </View>
          {!isVisible && <ThemedBadge variant="warning" text="Not visible yet" />}
        </View>

        <View style={styles.gameCardInfo}>
          <View style={styles.gameCardStat}>
            <MaterialIcons name="people" size={18} color={colors.textSecondary} />
            <ThemedTextBox variant="body" color="secondary">
              {`${game.player_count} signed up`}
            </ThemedTextBox>
          </View>

          {game.user_signed_up && (
            <View style={styles.gameCardStat}>
              <MaterialIcons name="check-circle" size={18} color={colors.success} />
              <ThemedTextBox variant="body" color="primary" weight="medium">
                You&apos;re signed up
              </ThemedTextBox>
            </View>
          )}
        </View>

        <View style={styles.gameCardFooter}>
          <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
        </View>
      </ThemedCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gameCardTouchable: {
    marginBottom: 12,
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gameCardDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gameCardDateText: {
    gap: 2,
  },
  gameCardInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  gameCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gameCardFooter: {
    alignItems: 'flex-end',
  },
});
