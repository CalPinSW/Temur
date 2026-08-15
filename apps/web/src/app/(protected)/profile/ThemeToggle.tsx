'use client';

import { useTransition } from 'react';
import type { ThemeMode } from '@/lib/theme';
import { setThemeMode } from './actions';

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

export function ThemeToggle({ currentMode }: { currentMode: ThemeMode }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-text">Appearance</span>
      <div className="flex rounded-lg border border-border p-0.5" aria-disabled={isPending}>
        {OPTIONS.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            disabled={isPending}
            aria-pressed={currentMode === mode}
            onClick={() => startTransition(() => setThemeMode(mode))}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors disabled:opacity-60 ${
              currentMode === mode
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
