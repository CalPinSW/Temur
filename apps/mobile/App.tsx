import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from '@/components/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastHost } from '@/components/ToastHost';
import { RootNavigator } from '@/navigation';
import { ThemeProvider, useTheme } from '@/theme';
import { initErrorCapture } from '@/services/errorCaptureService';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  // Only report from real builds (EAS preview/production) — never from
  // Expo Go / a dev client connected to Metro, so local work doesn't eat
  // into the free-tier event quota.
  enabled: !__DEV__,
});

// Must run after Sentry.init() so it chains onto Sentry's own global
// handler (itself chained to the original) rather than replacing it.
initErrorCapture();

function AppContent() {
  const { theme } = useTheme();
  return (
    <>
      <RootNavigator />
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastHost />
        <AuthProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
