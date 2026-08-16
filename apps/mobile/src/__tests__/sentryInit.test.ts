const mockInit = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: (...args: unknown[]) => mockInit(...args),
}));

describe('sentryInit', () => {
  it('initializes Sentry as a side effect of being imported, with tracing off', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- need a fresh module evaluation inside isolateModules
      require('../services/sentryInit');
    });

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0,
      })
    );
  });
});
