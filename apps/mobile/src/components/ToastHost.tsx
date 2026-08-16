import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { subscribeToast } from '@/services/toastService';

const TOAST_DURATION_MS = 4000;

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeToast((nextMessage) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(nextMessage);
      timerRef.current = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
    });
  }, []);

  if (!message) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { bottom: insets.bottom + 16 }]}>
      <View
        style={[
          styles.toast,
          { backgroundColor: colors.errorBackground, borderColor: colors.error },
        ]}
      >
        <Text style={[styles.text, { color: colors.error }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '100%',
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
  },
});
