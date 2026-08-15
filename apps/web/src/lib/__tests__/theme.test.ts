import { parseThemeMode } from '../theme';

describe('parseThemeMode', () => {
  it('returns light when the cookie is "light"', () => {
    expect(parseThemeMode('light')).toBe('light');
  });

  it('returns dark when the cookie is "dark"', () => {
    expect(parseThemeMode('dark')).toBe('dark');
  });

  it('returns system when the cookie is undefined', () => {
    expect(parseThemeMode(undefined)).toBe('system');
  });

  it('returns system for an unrecognized value', () => {
    expect(parseThemeMode('sepia')).toBe('system');
  });
});
