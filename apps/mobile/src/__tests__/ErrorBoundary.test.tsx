import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import { recordError } from '@temur/shared';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { showToast } from '@/services/toastService';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { background: '#fff', primary: '#000', error: '#f00', errorBackground: '#fee' },
  }),
}));

jest.mock('@temur/shared', () => ({
  recordError: jest.fn(),
}));

jest.mock('@/services/toastService', () => ({
  showToast: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.spyOn(console, 'error').mockImplementation(() => {});

function ThrowingChild(): React.ReactElement {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Text>All good</Text>
      </ErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('catches a render error, reports it, and shows a toast instead of crashing', async () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' })
    );
    expect(recordError).toHaveBeenCalledWith('boom');
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('went wrong'))
    );

    unmount();
  });
});
