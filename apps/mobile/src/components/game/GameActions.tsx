import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedButton } from '@/components/themed';

interface GameActionsProps {
  isUserSignedUp: boolean;
  isSigningUp: boolean;
  isWithdrawing: boolean;
  onSignUp: () => void;
  onWithdraw: () => void;
  isAdmin?: boolean;
  hasPlayers?: boolean;
  onNavigateToTeamAssignment?: () => void;
}

export function GameActions({
  isUserSignedUp,
  isSigningUp,
  isWithdrawing,
  onSignUp,
  onWithdraw,
  isAdmin,
  hasPlayers,
  onNavigateToTeamAssignment,
}: GameActionsProps) {
  return (
    <View>
      <View style={styles.actionButtons}>
        {isUserSignedUp ? (
          <ThemedButton
            title={isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
            variant="danger"
            onPress={onWithdraw}
            disabled={isWithdrawing}
            fullWidth
          />
        ) : (
          <ThemedButton
            title={isSigningUp ? 'Signing up...' : 'Sign Up'}
            variant="primary"
            onPress={onSignUp}
            disabled={isSigningUp}
            fullWidth
          />
        )}
      </View>

      {isAdmin && hasPlayers && onNavigateToTeamAssignment && (
        <View style={styles.adminActions}>
          <ThemedButton
            title="Assign Teams"
            variant="secondary"
            onPress={onNavigateToTeamAssignment}
            fullWidth
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtons: {
    marginTop: 8,
  },
  adminActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});
