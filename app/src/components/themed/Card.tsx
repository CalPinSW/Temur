import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface ThemedCardProps {
  children: ReactNode;
  title?: string;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export function ThemedCard({
  children,
  title,
  variant = 'elevated',
  padding = 'medium',
}: ThemedCardProps) {
  const { colors } = useTheme();

  const getCardStyle = (): ViewStyle => {
    const paddingMap = {
      none: 0,
      small: 8,
      medium: 16,
      large: 24,
    };

    const baseStyle: ViewStyle = {
      borderRadius: 12,
      gap: 8,
      padding: paddingMap[padding],
    };

    const variantStyles: Record<string, ViewStyle> = {
      elevated: {
        backgroundColor: colors.card,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
      },
      outlined: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
      },
      filled: {
        backgroundColor: colors.backgroundSecondary,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
    };
  };

  return (
    <View style={getCardStyle()}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
});
