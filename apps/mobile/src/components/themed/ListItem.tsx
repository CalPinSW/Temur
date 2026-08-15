import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface ThemedListItemProps {
  title: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  children?: ReactNode;
  disabled?: boolean;
}

export function ThemedListItem({
  title,
  value,
  onPress,
  showArrow = true,
  children,
  disabled = false,
}: ThemedListItemProps) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {children ? (
        children
      ) : (
        <>
          <Text style={[styles.title, { color: disabled ? colors.textTertiary : colors.text }]}>
            {title}
          </Text>
          <View style={styles.right}>
            {value && <Text style={[styles.value, { color: colors.textSecondary }]}>{value}</Text>}
            {showArrow && <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>}
          </View>
        </>
      )}
    </View>
  );

  if (onPress && !children) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 16,
  },
  arrow: {
    fontSize: 20,
  },
});
