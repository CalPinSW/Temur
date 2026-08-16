import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { showToast } from '@/services/toastService';

const AUTO_RESET_DELAY_MS = 800;

export function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { colors } = useTheme();

  useEffect(() => {
    showToast('Something went wrong. Please try again.');
    const timer = setTimeout(onReset, AUTO_RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [onReset]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
