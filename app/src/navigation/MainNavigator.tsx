import React, { useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import { HomeScreen } from '@/screens/home';
import { FriendsScreen, SearchUsersScreen, FriendRequestsScreen } from '@/screens/friends';
import { ProfileScreen, EditProfileScreen, AboutScreen } from '@/screens/profile';
import { MainFunctionalityScreen } from '@/screens/main/MainFunctionalityScreen';
import { AdminScreen } from '@/screens/admin';

export type MainTabParamList = {
  HomeTab: undefined;
  MainFunctionalityTab: undefined;
  FriendsTab: { screen?: 'list' | 'search' | 'requests' } | undefined;
  AdminTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function HomeStack() {
  const [screen, setScreen] = useState<'tab1' | 'tab2'>('tab1');

  return (
    <HomeScreen
      screen={screen}
      onSelectTab1={() => setScreen('tab1')}
      onSelectTab2={() => setScreen('tab2')}
    />
  );
}

function MainFunctionalityStack() {
  return <MainFunctionalityScreen />;
}

function FriendsStack({
  route,
}: {
  route?: { params?: { screen?: 'list' | 'search' | 'requests' } };
}) {
  const screenParam = route?.params?.screen;
  const [screen, setScreen] = useState<'list' | 'search' | 'requests'>(screenParam || 'list');

  // Update screen when route params change (e.g., from notification)
  useEffect(() => {
    if (screenParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScreen(screenParam);
    }
  }, [screenParam]);

  if (screen === 'search') {
    return <SearchUsersScreen onGoBack={() => setScreen('list')} />;
  }

  if (screen === 'requests') {
    return <FriendRequestsScreen onGoBack={() => setScreen('list')} />;
  }

  return (
    <FriendsScreen
      onNavigateToSearch={() => setScreen('search')}
      onNavigateToRequests={() => setScreen('requests')}
    />
  );
}

function AdminStack() {
  return <AdminScreen />;
}

function ProfileStack() {
  const [screen, setScreen] = useState<'profile' | 'edit' | 'about'>('profile');

  if (screen === 'edit') {
    return <EditProfileScreen onGoBack={() => setScreen('profile')} />;
  }

  if (screen === 'about') {
    return <AboutScreen onGoBack={() => setScreen('profile')} />;
  }

  return (
    <ProfileScreen onEditProfile={() => setScreen('edit')} onAbout={() => setScreen('about')} />
  );
}

function FriendsTabIcon({ pendingCount, color }: { pendingCount: number; color: string }) {
  return (
    <View style={{ position: 'relative' }}>
      <MaterialIcons name="groups" size={24} color={color} />
      {pendingCount > 0 && (
        <View style={badgeStyles.badge}>
          <Text style={badgeStyles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export function MainNavigator() {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending');
      setPendingRequestCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPendingCount();

    // Subscribe to friendship changes for real-time badge updates
    const channel = supabase
      .channel('friend-requests-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingCount]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      }}
    >
      {profile?.is_admin && (
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
          }}
        />
      )}
      <Tab.Screen
        name="MainFunctionalityTab"
        component={MainFunctionalityStack}
        options={{
          tabBarLabel: 'Main functionality',
          tabBarIcon: ({ color }) => <MaterialIcons name="agriculture" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="FriendsTab"
        component={FriendsStack}
        options={{
          tabBarLabel: 'Friends',
          tabBarIcon: ({ color }) => (
            <FriendsTabIcon pendingCount={pendingRequestCount} color={color} />
          ),
        }}
      />
      {profile?.is_admin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminStack}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color }) => <MaterialIcons name="admin-panel-settings" size={24} color={color} />,
          }}
        />
      )}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
