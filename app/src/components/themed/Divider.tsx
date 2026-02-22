import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface ThemedDividerProps {
  label?: string;
}

export function ThemedDivider({ label }: ThemedDividerProps) {
  const { colors } = useTheme();

  if (label) {
    return (
      <View style={styles.labelContainer}>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
        <Text style={[styles.label, { color: colors.textTertiary }]}>{label}</Text>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
      </View>
    );
  }

  return <View style={[styles.divider, { backgroundColor: colors.divider }]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    fontSize: 12,
    paddingHorizontal: 12,
  },
});
