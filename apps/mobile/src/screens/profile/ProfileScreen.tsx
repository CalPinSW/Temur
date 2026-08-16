import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/theme';
import { getAuthErrorMessage } from '@temur/shared';
import {
  getNotificationsEnabled,
  setNotificationsEnabled as updateNotificationPreference,
} from '@/services/notificationService';
import {
  ThemedButton,
  ThemedTextBox,
  ThemedInput,
  ThemedToggle,
  ThemedListItem,
} from '@/components/themed';

interface ProfileScreenProps {
  onEditProfile?: () => void;
  onAbout?: () => void;
  onReportBug?: () => void;
  onDeleteAccount?: () => void;
}

export function ProfileScreen({
  onEditProfile,
  onAbout,
  onReportBug,
  onDeleteAccount,
}: ProfileScreenProps) {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { colors, themeMode, setThemeMode } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    getNotificationsEnabled().then(setNotificationsEnabled);
  }, []);

  // Check if user signed up with email (not OAuth)
  const isEmailUser = user?.app_metadata?.provider === 'email' || !user?.app_metadata?.provider;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? getAuthErrorMessage(error) : 'Failed to change password'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile?.username?.slice(0, 2).toUpperCase() || '??';
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  const handleThemePress = () => {
    Alert.alert('Appearance', 'Choose your preferred theme', [
      { text: 'System', onPress: () => setThemeMode('system') },
      { text: 'Light', onPress: () => setThemeMode('light') },
      { text: 'Dark', onPress: () => setThemeMode('dark') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <ThemedTextBox variant="heading" weight="bold" style={styles.avatarText}>
                {getInitials()}
              </ThemedTextBox>
            </View>
          )}
          <ThemedTextBox variant="heading" weight="bold">
            {profile?.display_name || profile?.username || 'User'}
          </ThemedTextBox>
          <ThemedTextBox variant="body" color="secondary">
            {`@${profile?.username}`}
          </ThemedTextBox>
        </View>

        <View style={styles.section}>
          <ThemedTextBox
            variant="label"
            color="tertiary"
            weight="semibold"
            style={styles.sectionTitle}
          >
            ACCOUNT
          </ThemedTextBox>

          <ThemedListItem title="Edit Profile" onPress={onEditProfile} />

          {isEmailUser && (
            <ThemedListItem title="Change Password" onPress={() => setPasswordModalVisible(true)} />
          )}

          <ThemedListItem title="Appearance" value={getThemeLabel()} onPress={handleThemePress} />

          <ThemedListItem title="Push Notifications" showArrow={false}>
            <ThemedToggle
              label="Push Notifications"
              value={notificationsEnabled}
              onValueChange={async (value) => {
                setNotificationsEnabled(value);
                await updateNotificationPreference(value);
              }}
            />
          </ThemedListItem>

          <ThemedListItem
            title="Privacy Policy"
            onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL)}
          />

          <ThemedListItem title="Delete Account" onPress={onDeleteAccount} />
        </View>

        <View style={styles.section}>
          <ThemedTextBox
            variant="label"
            color="tertiary"
            weight="semibold"
            style={styles.sectionTitle}
          >
            SUPPORT
          </ThemedTextBox>

          <ThemedListItem
            title="Contact Support"
            onPress={() => Linking.openURL(`mailto:${process.env.EXPO_PUBLIC_SUPPORT_EMAIL}`)}
          />

          <ThemedListItem title="Report a Bug" onPress={onReportBug} />

          <ThemedListItem title="About" onPress={onAbout} />
        </View>

        <ThemedButton
          title="Sign Out"
          variant="danger"
          size="large"
          fullWidth
          onPress={handleSignOut}
        />
      </ScrollView>

      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <ThemedTextBox variant="subheading" weight="bold" align="center">
              Change Password
            </ThemedTextBox>

            <ThemedInput
              label="New Password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <ThemedInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <View style={styles.modalActions}>
              <View style={styles.modalButtonWrapper}>
                <ThemedButton
                  title="Cancel"
                  variant="secondary"
                  size="large"
                  fullWidth
                  onPress={() => {
                    setPasswordModalVisible(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                />
              </View>
              <View style={styles.modalButtonWrapper}>
                <ThemedButton
                  title="Change"
                  variant="primary"
                  size="large"
                  fullWidth
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                  loading={isChangingPassword}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButtonWrapper: {
    flex: 1,
  },
});
