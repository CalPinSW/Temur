'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { THEME_COOKIE, type ThemeMode } from '@/lib/theme';

export async function setThemeMode(mode: ThemeMode) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, mode, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  });
  revalidatePath('/', 'layout');
}
