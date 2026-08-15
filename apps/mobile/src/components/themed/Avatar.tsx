import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface ThemedAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  size?: number;
}

function getInitials(displayName?: string | null, username?: string | null) {
  if (displayName) {
    return displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return username?.slice(0, 2).toUpperCase() || '??';
}

export function ThemedAvatar({ avatarUrl, displayName, username, size = 36 }: ThemedAvatarProps) {
  const { colors } = useTheme();
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={dimensionStyle} />;
  }

  return (
    <View style={[styles.placeholder, dimensionStyle, { backgroundColor: colors.primary }]}>
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>
        {getInitials(displayName, username)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
