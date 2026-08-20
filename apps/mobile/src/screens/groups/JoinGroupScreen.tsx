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

// Distinguishes a transient network failure (the fetch itself never reached
// the server) from the RPC's own rejection (e.g. an actually invalid or
// expired token) — supabase-js reports both the same way, as an object with
// {message, details, hint, code}, so this is the only signal available.
// Worth telling apart: a network blip should invite a retry, not tell the
// user their invite is dead.
function isNetworkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('Network request failed');
}

export function JoinGroupScreen({ token, onJoined, onGoBack }: JoinGroupScreenProps) {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    joinGroupViaLink(token)
      .then((groupId) => {
        if (!cancelled) onJoined(groupId);
      })
      .catch((err) => {
        console.error('Join group via link error:', err);
        Sentry.captureException(err);
        if (cancelled) return;
        setError(
          isNetworkError(err)
            ? "Couldn't connect. Check your connection and try again."
            : (err instanceof Error ? err.message : null) ||
                'This join link is invalid or has expired.'
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, attempt]);

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
            title="Try Again"
            variant="primary"
            onPress={() => setAttempt((prev) => prev + 1)}
            style={styles.button}
          />
          <ThemedButton title="Go Back" variant="ghost" onPress={onGoBack} style={styles.button} />
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
