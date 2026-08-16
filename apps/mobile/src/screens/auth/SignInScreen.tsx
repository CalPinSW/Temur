import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox } from '@/components/themed';
import { getAuthErrorMessage } from '@temur/shared';

interface SignInScreenProps {
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
}

export function SignInScreen({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
}: SignInScreenProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = useAuthStore((state) => state.signIn);
  const signInWithSocial = useAuthStore((state) => state.signInWithSocial);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    const { error } = await signIn({ email, password });

    if (error) {
      Alert.alert('Sign In Failed', getAuthErrorMessage(error));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to continue splitting bills
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={colors.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Enter your password"
              placeholderTextColor={colors.inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
          </View>
          <ThemedButton
            variant="ghost"
            onPress={onNavigateToForgotPassword}
            title="Forgot password?"
          />
          <ThemedButton
            variant="primary"
            size="large"
            onPress={handleSignIn}
            disabled={isLoading || socialLoading !== null}
            title="Sign In"
          />
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <ThemedTextBox variant="caption" color="secondary">
              or continue with
            </ThemedTextBox>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialButtons}>
            <ThemedButton
              variant="outline"
              size="large"
              onPress={async () => {
                setSocialLoading('google');
                const { error } = await signInWithSocial('google');
                setSocialLoading(null);
                if (error) Alert.alert('Error', error.message);
              }}
              disabled={isLoading || socialLoading !== null}
              title="🄶 Google"
            />
            {Platform.OS === 'ios' && (
              <ThemedButton
                variant="outline"
                size="large"
                onPress={async () => {
                  setSocialLoading('apple');
                  const { error } = await signInWithSocial('apple');
                  setSocialLoading(null);
                  if (error) Alert.alert('Error', error.message);
                }}
                disabled={isLoading || socialLoading !== null}
                title=" Apple"
              />
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedTextBox variant="caption" color="secondary">
            Don&apos;t have an account?
          </ThemedTextBox>
          <ThemedButton variant="ghost" onPress={onNavigateToSignUp} title="Sign Up" />
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  socialButtons: {
    gap: 12,
  },
});
