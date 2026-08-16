import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedInput, ThemedTextBox } from '@/components/themed';
import { getAuthErrorMessage } from '@temur/shared';

const MIN_PASSWORD_LENGTH = 6;

// Rendered standalone by RootNavigator (not part of AuthNavigator or
// MainNavigator) whenever isPasswordRecovery is true — reached only via
// the password-reset email link (see useAuthDeepLinks), never by direct
// navigation, so it has no onNavigateTo* props of its own.
export function ResetPasswordScreen() {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const updatePasswordAfterRecovery = useAuthStore((state) => state.updatePasswordAfterRecovery);
  const signOut = useAuthStore((state) => state.signOut);
  const isLoading = useAuthStore((state) => state.isLoading);

  const handleSubmit = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Error', `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const { error } = await updatePasswordAfterRecovery(password);

    if (error) {
      Alert.alert('Error', getAuthErrorMessage(error));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedTextBox variant="heading">Set a New Password</ThemedTextBox>
          <ThemedTextBox variant="subheading" color="secondary">
            Choose a new password for your account.
          </ThemedTextBox>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedInput
              label="New Password"
              placeholder="At least 6 characters"
              placeholderTextColor={colors.inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              placeholderTextColor={colors.inputPlaceholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <ThemedButton
            variant="primary"
            onPress={handleSubmit}
            disabled={isLoading}
            title="Set New Password"
          />
        </View>

        <View style={styles.footer}>
          <ThemedButton variant="ghost" onPress={() => signOut()} title="Cancel" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
});
