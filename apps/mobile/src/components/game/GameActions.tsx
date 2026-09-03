import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedButton } from '@/components/themed';

interface GameActionsProps {
  isSigningUp: boolean;
  onSignUp: () => void;
}

export function GameActions({ isSigningUp, onSignUp }: GameActionsProps) {
  return (
    <View style={styles.actionButtons}>
      <ThemedButton
        title={isSigningUp ? 'Signing up...' : 'Sign Up'}
        variant="primary"
        onPress={onSignUp}
        disabled={isSigningUp}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtons: {
    marginTop: 8,
  },
});
