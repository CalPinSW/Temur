import React, { useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { supabase } from '@/services/supabase';
import { navigateToGame } from '@/services/navigationService';
import { useAuthStore } from '@/store/authStore';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import { HomeScreen } from '@/screens/home';
import {
  FriendsScreen,
  SearchUsersScreen,
  FriendRequestsScreen,
  RingersScreen,
} from '@/screens/friends';
import { ProfileScreen, EditProfileScreen, AboutScreen } from '@/screens/profile';
import { MainFunctionalityScreen, CreateGameScreen } from '@/screens/main';
import {
  GroupsListScreen,
  CreateGroupScreen,
  GroupDetailScreen,
  InvitePlayerScreen,
  GroupInvitesScreen,
  GroupGamesScreen,
  GroupMembersScreen,
} from '@/screens/groups';

export type MainTabParamList = {
  HomeTab: undefined;
  MainFunctionalityTab: { screen?: 'detail'; gameId?: string } | undefined;
  FriendsTab: { screen?: 'list' | 'search' | 'requests' | 'ringers' } | undefined;
  GroupsTab: { screen?: 'list' | 'invites' } | undefined;
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

function MainFunctionalityStack({
  route,
}: {
  route?: { params?: { screen?: 'detail'; gameId?: string } };
}) {
  return <MainFunctionalityScreen route={route} />;
}

function FriendsStack({
  route,
}: {
  route?: { params?: { screen?: 'list' | 'search' | 'requests' | 'ringers' } };
}) {
  const screenParam = route?.params?.screen;
  const [screen, setScreen] = useState<'list' | 'search' | 'requests' | 'ringers'>(
    screenParam || 'list'
  );

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

  if (screen === 'ringers') {
    return <RingersScreen onGoBack={() => setScreen('list')} />;
  }

  return (
    <FriendsScreen
      onNavigateToSearch={() => setScreen('search')}
      onNavigateToRequests={() => setScreen('requests')}
      onNavigateToRingers={() => setScreen('ringers')}
    />
  );
}

function GroupsStack({ route }: { route?: { params?: { screen?: 'list' | 'invites' } } }) {
  const screenParam = route?.params?.screen;
  const [screen, setScreen] = useState<
    'list' | 'create' | 'detail' | 'invite' | 'invites' | 'creategame' | 'games' | 'members'
  >(screenParam || 'list');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [inviteContext, setInviteContext] = useState<{
    groupName: string;
    existingMemberIds: string[];
  } | null>(null);

  useEffect(() => {
    if (screenParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScreen(screenParam);
    }
  }, [screenParam]);

  if (screen === 'invites') {
    return <GroupInvitesScreen onGoBack={() => setScreen('list')} />;
  }

  if (screen === 'create') {
    return (
      <CreateGroupScreen
        onGoBack={() => setScreen('list')}
        onCreated={(newGroupId) => {
          setGroupId(newGroupId);
          setScreen('detail');
        }}
      />
    );
  }

  if (screen === 'invite' && groupId && inviteContext) {
    return (
      <InvitePlayerScreen
        groupId={groupId}
        groupName={inviteContext.groupName}
        existingMemberIds={inviteContext.existingMemberIds}
        onGoBack={() => setScreen('detail')}
      />
    );
  }

  if (screen === 'creategame' && groupId) {
    return (
      <CreateGameScreen
        presetGroupId={groupId}
        onGoBack={() => setScreen('detail')}
        onCreated={() => setScreen('detail')}
      />
    );
  }

  if (screen === 'games' && groupId) {
    return (
      <GroupGamesScreen
        groupId={groupId}
        onGoBack={() => setScreen('detail')}
        onNavigateToGame={(gameId) => navigateToGame(gameId)}
      />
    );
  }

  if (screen === 'members' && groupId) {
    return <GroupMembersScreen groupId={groupId} onGoBack={() => setScreen('detail')} />;
  }

  if (screen === 'detail' && groupId) {
    return (
      <GroupDetailScreen
        groupId={groupId}
        onGoBack={() => setScreen('list')}
        onNavigateToInvite={(id, groupName, existingMemberIds) => {
          setGroupId(id);
          setInviteContext({ groupName, existingMemberIds });
          setScreen('invite');
        }}
        onNavigateToCreateGame={(id) => {
          setGroupId(id);
          setScreen('creategame');
        }}
        onNavigateToGames={() => setScreen('games')}
        onNavigateToGame={(gameId) => navigateToGame(gameId)}
        onNavigateToMembers={() => setScreen('members')}
      />
    );
  }

  return (
    <GroupsListScreen
      onNavigateToCreate={() => setScreen('create')}
      onNavigateToGroup={(id) => {
        setGroupId(id);
        setScreen('detail');
      }}
      onNavigateToInvites={() => setScreen('invites')}
    />
  );
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

function GroupsTabIcon({ pendingCount, color }: { pendingCount: number; color: string }) {
  return (
    <View style={{ position: 'relative' }}>
      <MaterialIcons name="group-work" size={24} color={color} />
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
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [pendingGroupInviteCount, setPendingGroupInviteCount] = useState(0);

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

  const fetchPendingGroupInviteCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('group_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_user_id', user.id);
      setPendingGroupInviteCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending group invite count:', error);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPendingGroupInviteCount();

    const channel = supabase
      .channel('group-invites-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_invitations',
        },
        () => {
          fetchPendingGroupInviteCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingGroupInviteCount]);

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
      {__DEV__ && (
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
          tabBarLabel: 'Games',
          tabBarIcon: ({ color }) => <MaterialIcons name="sports-soccer" size={24} color={color} />,
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
      <Tab.Screen
        name="GroupsTab"
        component={GroupsStack}
        options={{
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color }) => (
            <GroupsTabIcon pendingCount={pendingGroupInviteCount} color={color} />
          ),
        }}
      />
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
