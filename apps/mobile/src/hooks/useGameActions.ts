import { useState } from 'react';
import { Alert } from 'react-native';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { GameWithPlayers, getNextSignupOrder } from '@temur/shared';
import * as Sentry from '@sentry/react-native';

export function useGameActions(gameId: string, userId?: string) {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignUp = async (game: GameWithPlayers, onSuccess: () => void) => {
    if (!game || !userId) return;

    try {
      setIsSigningUp(true);

      const nextSignupOrder = getNextSignupOrder(game.player_games);

      const { error } = await supabase.from('player_games').insert({
        game_id: gameId,
        user_id: userId,
        signup_order: nextSignupOrder,
      });

      if (error) throw error;

      Alert.alert('Success', 'You have signed up for this game!');
      onSuccess();
    } catch (error) {
      console.error('Error signing up:', error);
      Sentry.captureException(error);
      if ((error as PostgrestError).code === '23505') {
        Alert.alert('Error', 'You are already signed up for this game');
      } else {
        Alert.alert('Error', 'Failed to sign up. Please try again.');
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleWithdraw = async (game: GameWithPlayers, onSuccess: () => void) => {
    if (!game || !userId) return;

    const userPlayerGame = game.player_games.find((pg) => pg.user_id === userId);
    const position = userPlayerGame?.signup_order || 0;

    Alert.alert(
      'Withdraw from Game',
      `Are you sure you want to withdraw from this game?\n\nYou are currently in position ${position}. If you change your mind later, your position could be taken by another player and you may have to join at the end of the queue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsWithdrawing(true);

              const { error } = await supabase
                .from('player_games')
                .delete()
                .eq('game_id', gameId)
                .eq('user_id', userId);

              if (error) throw error;

              Alert.alert('Success', 'You have withdrawn from this game');
              onSuccess();
            } catch (error) {
              console.error('Error withdrawing:', error);
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to withdraw. Please try again.');
            } finally {
              setIsWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (onSuccess: () => void) => {
    Alert.alert(
      'Delete Game',
      'Are you sure you want to delete this game? This cannot be undone from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);

              const { error } = await supabase.rpc('delete_game', { p_game_id: gameId });

              if (error) throw error;

              onSuccess();
            } catch (error) {
              console.error('Error deleting game:', error);
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to delete game. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return { isSigningUp, isWithdrawing, isDeleting, handleSignUp, handleWithdraw, handleDelete };
}
