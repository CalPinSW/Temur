import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox } from '@/components/themed';
import { joinGroupViaLink } from '@/services/groupService';

interface JoinGroupScreenProps {
  token: string;
  onJoined: (groupId: string) => void;
  onGoBack: () => void;
}

export function JoinGroupScreen({ token, onJoined, onGoBack }: JoinGroupScreenProps) {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    joinGroupViaLink(token)
      .then((groupId) => {
        if (!cancelled) onJoined(groupId);
      })
      .catch((err) => {
        console.error('Join group via link error:', err);
        Sentry.captureException(err);
        if (!cancelled) setError('This join link is invalid or has expired.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.centered}>
          <ThemedTextBox variant="subheading" weight="semibold" align="center">
            {error}
          </ThemedTextBox>
          <ThemedButton
            title="Go Back"
            variant="primary"
            onPress={onGoBack}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedTextBox variant="body" color="secondary" style={styles.loadingText}>
          Joining group…
        </ThemedTextBox>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    marginTop: 8,
  },
  button: {
    marginTop: 8,
  },
});
