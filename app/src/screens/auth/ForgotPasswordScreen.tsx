import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedInput, ThemedTextBox } from '@/components/themed';

interface ForgotPasswordScreenProps {
  onNavigateToSignIn: () => void;
}

export function ForgotPasswordScreen({ onNavigateToSignIn }: ForgotPasswordScreenProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const resetPassword = useAuthStore((state) => state.resetPassword);
  const isLoading = useAuthStore((state) => state.isLoading);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const { error } = await resetPassword(email);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }, styles.successContent]}
      >
        <ThemedTextBox variant="heading">✉️</ThemedTextBox>
        <ThemedTextBox variant="heading">Check Your Email</ThemedTextBox>
        <ThemedTextBox>
          We&apos;ve sent a password reset link to {email}. Please check your inbox and follow the
          instructions.
        </ThemedTextBox>
        <ThemedButton variant="primary" onPress={onNavigateToSignIn} title="Back to Sign In" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedTextBox variant="heading">Reset Password</ThemedTextBox>
          <ThemedTextBox variant="subheading" color="secondary">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </ThemedTextBox>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedInput
              label="Email"
              placeholder="you@example.com"
              placeholderTextColor={colors.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <ThemedButton
            variant="primary"
            onPress={handleResetPassword}
            disabled={isLoading}
            title="Send Reset Link"
          />
        </View>

        <View style={styles.footer}>
          <ThemedTextBox variant="caption" color="secondary">
            Remember your password?
          </ThemedTextBox>
          <ThemedButton variant="ghost" onPress={onNavigateToSignIn} title="Sign In" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  successContent: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
