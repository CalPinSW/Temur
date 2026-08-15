import { cookies } from 'next/headers';

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_COOKIE = 'theme';

export function parseThemeMode(value: string | undefined): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function getThemeMode(): Promise<ThemeMode> {
  const cookieStore = await cookies();
  return parseThemeMode(cookieStore.get(THEME_COOKIE)?.value);
}
