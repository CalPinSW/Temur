import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { getRecentErrors } from '@temur/shared';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedButton, ThemedInput } from '@/components/themed';

interface ReportBugScreenProps {
  onGoBack: () => void;
}

export function ReportBugScreen({ onGoBack }: ReportBugScreenProps) {
  const { colors } = useTheme();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe what happened.');
      return;
    }

    setIsSubmitting(true);
    try {
      const context = {
        platform: Platform.OS,
        osVersion: Platform.Version,
        appVersion: Constants.expoConfig?.version,
        buildNumber:
          Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode,
        recentErrors: getRecentErrors(),
      };

      const { error } = await supabase.functions.invoke('send-bug-report', {
        body: { description: description.trim(), context },
      });
      if (error) throw error;

      setSubmitted(true);
    } catch {
      Alert.alert(
        'Error',
        'Failed to submit bug report. Please try again, or email support directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton onPress={onGoBack} variant="ghost" title="← Back" />
        <ThemedTextBox variant="heading" weight="semibold">
          Report a Bug
        </ThemedTextBox>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {submitted ? (
          <ThemedTextBox variant="body" color="success" align="center">
            Thanks — your report has been sent to support.
          </ThemedTextBox>
        ) : (
          <>
            <ThemedTextBox variant="body" color="secondary">
              Found something broken? Let us know what happened.
            </ThemedTextBox>

            <ThemedInput
              placeholder="What were you trying to do, and what went wrong?"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
            />

            <ThemedTextBox variant="caption" color="tertiary">
              We&apos;ll also include your account, app version, and any recent errors from this
              session to help track down the issue.
            </ThemedTextBox>

            <ThemedButton
              title="Send Report"
              variant="primary"
              size="large"
              fullWidth
              onPress={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </>
        )}
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
    gap: 16,
  },
});
