import React, { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  type NotificationChannel,
  type NotificationPreferences,
  type NotificationType,
} from '@temur/shared';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox, ThemedToggle, ThemedDivider } from '@/components/themed';
import {
  getNotificationPreferences,
  setNotificationPreference,
  setAllNotificationPreferences,
} from '@/services/notificationService';

interface NotificationPreferencesScreenProps {
  onGoBack: () => void;
}

const CHANNELS: { channel: NotificationChannel; label: string }[] = [
  { channel: 'push_enabled', label: 'Push' },
  { channel: 'email_enabled', label: 'Email' },
];

export function NotificationPreferencesScreen({ onGoBack }: NotificationPreferencesScreenProps) {
  const { colors } = useTheme();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPreferences)
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggle = async (
    type: NotificationType,
    channel: NotificationChannel,
    value: boolean
  ) => {
    if (!preferences) return;
    const previous = preferences;
    setPreferences({ ...preferences, [type]: { ...preferences[type], [channel]: value } });

    try {
      await setNotificationPreference(type, previous[type], channel, value);
    } catch (error) {
      console.error('Error updating notification preference:', error);
      Sentry.captureException(error);
      setPreferences(previous);
      Alert.alert('Error', 'Failed to update notification preference');
    }
  };

  const handleToggleAll = async (channel: NotificationChannel, value: boolean) => {
    if (!preferences) return;
    const previous = preferences;
    const next = Object.fromEntries(
      NOTIFICATION_TYPES.map((type) => [type, { ...preferences[type], [channel]: value }])
    ) as NotificationPreferences;
    setPreferences(next);

    try {
      await setAllNotificationPreferences(previous, channel, value);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      Sentry.captureException(error);
      setPreferences(previous);
      Alert.alert('Error', 'Failed to update notification preferences');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <ThemedButton title="← Back" variant="ghost" onPress={onGoBack} style={styles.backButton} />
      </View>

      {isLoading || !preferences ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedTextBox variant="body" color="secondary">
            Choose how you&apos;d like to be notified for each type of activity.
          </ThemedTextBox>

          <View style={styles.row}>
            <View style={styles.labelColumn} />
            {CHANNELS.map(({ channel, label }) => (
              <ThemedTextBox
                key={channel}
                variant="label"
                color="tertiary"
                weight="semibold"
                align="center"
                style={styles.channelColumn}
              >
                {label}
              </ThemedTextBox>
            ))}
          </View>

          <View style={styles.row}>
            <ThemedTextBox variant="body" weight="semibold" style={styles.labelColumn}>
              Select all
            </ThemedTextBox>
            {CHANNELS.map(({ channel }) => (
              <View key={channel} style={styles.channelColumn}>
                <ThemedToggle
                  value={NOTIFICATION_TYPES.every((type) => preferences[type][channel])}
                  onValueChange={(value) => handleToggleAll(channel, value)}
                />
              </View>
            ))}
          </View>

          <ThemedDivider />

          {NOTIFICATION_TYPES.map((type) => (
            <View key={type} style={styles.row}>
              <ThemedTextBox variant="body" style={styles.labelColumn}>
                {NOTIFICATION_TYPE_LABELS[type]}
              </ThemedTextBox>
              {CHANNELS.map(({ channel }) => (
                <View key={channel} style={styles.channelColumn}>
                  <ThemedToggle
                    value={preferences[type][channel]}
                    onValueChange={(value) => handleToggle(type, channel, value)}
                  />
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  labelColumn: {
    flex: 1,
    paddingRight: 8,
  },
  channelColumn: {
    width: 56,
    alignItems: 'center',
  },
});
