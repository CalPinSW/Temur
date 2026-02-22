import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedCard, ThemedButton } from '@/components/themed';

interface AboutScreenProps {
  onGoBack: () => void;
}

export function AboutScreen({ onGoBack }: AboutScreenProps) {
  const { colors } = useTheme();
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || '1';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton onPress={onGoBack} variant="ghost" title="← Back" />
        <ThemedTextBox variant="heading" weight="semibold">
          About
        </ThemedTextBox>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoSection}>
          <Text style={styles.appIcon}>🧾</Text>
          <ThemedTextBox variant="heading" weight="bold" align="center">
            App Name
          </ThemedTextBox>
          <ThemedTextBox variant="body" color="secondary" align="center">
            App Tagline
          </ThemedTextBox>
        </View>

        <ThemedCard variant="filled" padding="medium">
          <View style={styles.infoRow}>
            <ThemedTextBox variant="body" color="secondary">
              Version
            </ThemedTextBox>
            <ThemedTextBox variant="body" weight="semibold">
              {appVersion}
            </ThemedTextBox>
          </View>
          <View style={styles.infoRow}>
            <ThemedTextBox variant="body" color="secondary">
              Build
            </ThemedTextBox>
            <ThemedTextBox variant="body" weight="semibold">
              {buildNumber}
            </ThemedTextBox>
          </View>
        </ThemedCard>

        <View style={styles.linksSection}>
          <ThemedButton
            title="View on GitHub"
            variant="outline"
            size="large"
            fullWidth
            onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_GITHUB_REPO_URL)}
          />
        </View>

        <ThemedTextBox variant="caption" color="tertiary" align="center">
          {`© ${new Date().getFullYear()} App Name. All rights reserved.`}
        </ThemedTextBox>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 80,
  },
  content: {
    padding: 24,
    gap: 24,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    gap: 6,
  },
  appIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  linksSection: {
    width: '100%',
    borderRadius: 12,
    gap: 12,
  },
});
