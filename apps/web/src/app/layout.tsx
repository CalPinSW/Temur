import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getThemeMode } from '@/lib/theme';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Temur',
  description: 'Organize 5-a-side games with friends and groups.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const themeMode = await getThemeMode();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      data-theme={themeMode === 'system' ? undefined : themeMode}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
