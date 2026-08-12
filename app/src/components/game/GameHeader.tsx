import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedBadge } from '@/components/themed';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { formatDate, formatTime } from '@/utils/gameUtils';

interface GameHeaderProps {
  kickoffDate: string;
  isPast: boolean;
  isVisible: boolean;
}

export function GameHeader({ kickoffDate, isPast, isVisible }: GameHeaderProps) {
  const { colors } = useTheme();

  return (
    <View>
      <View style={styles.gameHeader}>
        <MaterialIcons
          name="event"
          size={32}
          color={isPast ? colors.textSecondary : colors.primary}
        />
        <View style={styles.gameHeaderText}>
          <ThemedTextBox variant="heading" weight="bold" color="primary">
            {formatDate(kickoffDate)}
          </ThemedTextBox>
          <ThemedTextBox variant="subheading" color="secondary">
            {formatTime(kickoffDate)}
          </ThemedTextBox>
        </View>
      </View>

      {!isVisible && (
        <View style={styles.visibilityNotice}>
          <ThemedBadge variant="warning" text="This game is not visible to players yet" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  gameHeaderText: {
    flex: 1,
    gap: 4,
  },
  visibilityNotice: {
    marginBottom: 16,
  },
});
