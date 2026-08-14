import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ThemedButton, ThemedTextBox, ThemedCard, ThemedInput } from '@/components/themed';
import { useAuthStore } from '@/store/authStore';
import { createGroup } from '@/services/groupService';

interface CreateGroupScreenProps {
  onGoBack: () => void;
  onCreated: (groupId: string) => void;
}

export function CreateGroupScreen({ onGoBack, onCreated }: CreateGroupScreenProps) {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;

    try {
      setIsCreating(true);
      const group = await createGroup(name.trim(), description.trim() || null, user.id);
      onCreated(group.id);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton title="← Back" variant="ghost" onPress={onGoBack} style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <ThemedTextBox variant="heading" weight="bold" color="primary">
            Create Group
          </ThemedTextBox>
          <ThemedTextBox variant="body" color="secondary" style={styles.subtitle}>
            You&apos;ll be the first admin. Invite others and create games for the group afterwards.
          </ThemedTextBox>
        </View>

        <ThemedCard variant="elevated">
          <View style={styles.formSection}>
            <ThemedInput
              label="Group Name"
              placeholder="e.g. Tuesday Night Football"
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.formSection}>
            <ThemedInput
              label="Description (optional)"
              placeholder="What's this group for?"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
          <ThemedButton
            title={isCreating ? 'Creating...' : 'Create Group'}
            variant="primary"
            onPress={handleCreate}
            disabled={isCreating || !name.trim()}
            fullWidth
          />
        </ThemedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  titleSection: {
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 8,
  },
  formSection: {
    marginBottom: 16,
  },
});
