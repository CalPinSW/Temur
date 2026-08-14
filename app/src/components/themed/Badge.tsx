import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface ThemedBadgeProps {
  text: string;
  variant?: BadgeVariant;
}

export function ThemedBadge({ text, variant = 'default' }: ThemedBadgeProps) {
  const { colors, theme } = useTheme();

  const getColors = () => {
    const variants = {
      default: {
        bg: colors.backgroundTertiary,
        text: colors.text,
      },
      success: {
        bg: theme === 'light' ? '#E3F7F7' : '#0D3A3A',
        text: colors.success,
      },
      error: {
        bg: colors.errorBackground,
        text: colors.error,
      },
      warning: {
        bg: theme === 'light' ? '#FEF3C7' : '#422006',
        text: theme === 'light' ? '#D97706' : '#FBBF24',
      },
      info: {
        bg: theme === 'light' ? '#DBEAFE' : '#1E3A5F',
        text: colors.primary,
      },
    };
    return variants[variant];
  };

  const badgeColors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
      <Text style={[styles.text, { color: badgeColors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
