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
import { UsernameInput, validateUsername, DisplayNameInput } from '@/components/form';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox } from '@/components/themed';
import { getAuthErrorMessage } from '@temur/shared';

interface SignUpScreenProps {
  onNavigateToSignIn: () => void;
}

export function SignUpScreen({ onNavigateToSignIn }: SignUpScreenProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const signUp = useAuthStore((state) => state.signUp);
  const signInWithSocial = useAuthStore((state) => state.signInWithSocial);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const usernameValidationError = validateUsername(username);
    if (usernameValidationError) {
      setUsernameError(usernameValidationError);
      return;
    }

    const { error } = await signUp({
      email,
      password,
      username,
      displayName: displayName || undefined,
    });

    if (error) {
      Alert.alert('Sign Up Failed', getAuthErrorMessage(error));
    } else {
      Alert.alert(
        'Check Your Email',
        'We sent you a confirmation link. Please check your email to verify your account.',
        [{ text: 'OK', onPress: onNavigateToSignIn }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Create an account to get started
          </Text>
        </View>
        <View>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email *</Text>
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

          <UsernameInput
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setUsernameError('');
            }}
            error={usernameError}
            required
          />

          <DisplayNameInput value={displayName} onChangeText={setDisplayName} />

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Password *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm Password *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
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
            onPress={handleSignUp}
            disabled={isLoading || socialLoading !== null}
            title="Sign Up"
          />
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <ThemedTextBox variant="caption" color="secondary">
              or sign up with
            </ThemedTextBox>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.socialButtons}>
            <ThemedButton
              size="large"
              variant="outline"
              onPress={async () => {
                setSocialLoading('google');
                const { error } = await signInWithSocial('google');
                setSocialLoading(null);
                if (error) Alert.alert('Error', error.message);
              }}
              disabled={isLoading || socialLoading !== null}
              title="🄶 Google"
            ></ThemedButton>

            {Platform.OS === 'ios' && (
              <ThemedButton
                size="large"
                variant="outline"
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
            Already have an account?
          </ThemedTextBox>
          <ThemedButton onPress={onNavigateToSignIn} title="Sign In" variant="ghost" />
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
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
  },
  socialButtons: {
    gap: 12,
  },
});
