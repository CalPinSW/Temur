import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SignInScreen, SignUpScreen, ForgotPasswordScreen } from '@/screens/auth';
import { useTheme } from '@/theme';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="SignIn">
        {(props) => (
          <SignInScreen
            onNavigateToSignUp={() => props.navigation.navigate('SignUp')}
            onNavigateToForgotPassword={() => props.navigation.navigate('ForgotPassword')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="SignUp">
        {(props) => <SignUpScreen onNavigateToSignIn={() => props.navigation.navigate('SignIn')} />}
      </Stack.Screen>
      <Stack.Screen name="ForgotPassword">
        {(props) => (
          <ForgotPasswordScreen onNavigateToSignIn={() => props.navigation.navigate('SignIn')} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
