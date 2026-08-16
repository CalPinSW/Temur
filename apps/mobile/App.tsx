import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from '@/components/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastHost } from '@/components/ToastHost';
import { RootNavigator } from '@/navigation';
import { ThemeProvider, useTheme } from '@/theme';
import { initErrorCapture } from '@/services/errorCaptureService';

// Sentry itself is initialized even earlier, in index.ts (imported before
// App) — see src/services/sentryInit.ts for why. This just chains our own
// error-capture ring buffer onto the handler Sentry already installed.
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
