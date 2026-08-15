import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/theme';
import {
  navigationRef,
  navigateFromNotification,
  NotificationScreen,
} from '@/services/navigationService';

export function RootNavigator() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const { colors } = useTheme();

  // Initialize push notifications when user is logged in
  useNotifications({
    userId: user?.id,
    onNotificationReceived: (notification) => {
      console.log('Notification received:', notification);
    },
    onNotificationResponse: (response) => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      const screen = data?.screen as NotificationScreen;
      if (screen) {
        navigateFromNotification(screen, data);
      }
    },
  });

  if (!isInitialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
