import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { ThemedTextBox, ThemedButton, ThemedInput } from '@/components/themed';

interface DeleteAccountScreenProps {
  onGoBack: () => void;
}

export function DeleteAccountScreen({ onGoBack }: DeleteAccountScreenProps) {
  const { colors } = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmationTarget = profile?.username ?? '';
  const typedConfirmation = confirmText.trim().toLowerCase();
  const isConfirmed =
    typedConfirmation.length > 0 &&
    (typedConfirmation === confirmationTarget.toLowerCase() ||
      typedConfirmation === (user?.email ?? '').toLowerCase());

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This is permanent. Are you absolutely sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const { error } = await deleteAccount();
            setIsDeleting(false);
            if (error) {
              Alert.alert('Error', 'Failed to delete your account. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton onPress={onGoBack} variant="ghost" title="← Back" />
        <ThemedTextBox variant="heading" weight="semibold">
          Delete Account
        </ThemedTextBox>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedTextBox variant="body" color="secondary">
          Deleting your account is permanent and cannot be undone. This will remove your profile,
          friends, group memberships, game signups, and ratings. Signing up again later — even with
          the same email — starts a brand new account with none of this data.
        </ThemedTextBox>

        <ThemedTextBox variant="body" color="secondary">
          Games and groups you created will stay for other members, with your name removed. Groups
          you&apos;re the only member of will be deleted along with their games.
        </ThemedTextBox>

        <ThemedInput
          label={`Type "${confirmationTarget}" or your email to confirm`}
          placeholder={confirmationTarget}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <ThemedButton
          title={isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
          variant="danger"
          size="large"
          fullWidth
          onPress={handleDelete}
          disabled={!isConfirmed || isDeleting}
          loading={isDeleting}
        />
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
