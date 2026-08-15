import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface PlayerAvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  size?: number;
}

export function PlayerAvatar({ avatarUrl, displayName, size = 36 }: PlayerAvatarProps) {
  const { colors } = useTheme();

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={dimensions} />;
  }

  return (
    <View style={[styles.placeholder, dimensions, { backgroundColor: colors.primary }]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
