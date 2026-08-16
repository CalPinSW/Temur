import React from 'react';
import * as Sentry from '@sentry/react-native';
import { recordError } from '@temur/shared';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches uncaught render-time exceptions anywhere below it — the mobile
// equivalent of web's app/error.tsx boundary. Handled failures (a Supabase
// call returning { error }) never reach this; it's specifically for bugs
// that would otherwise crash the whole app with no recovery UI.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error);
    recordError(error.message);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.reset} />;
    }
    return this.props.children;
  }
}
