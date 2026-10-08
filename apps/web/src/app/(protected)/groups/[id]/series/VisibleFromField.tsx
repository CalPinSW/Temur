'use client';

import type { SeriesVisibility } from '@temur/shared';

const pad = (n: number) => String(n).padStart(2, '0');

export const toTimeInput = (hours: number, minutes: number): string =>
  `${pad(hours)}:${pad(minutes)}`;

export const parseTimeInput = (value: string): { hours: number; minutes: number } | null => {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return { hours, minutes };
};

const inputClass =
  'rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary';

export function VisibleFromField({
  visibility,
  onDaysBeforeChange,
  onTimeChange,
}: {
  visibility: SeriesVisibility;
  onDaysBeforeChange: (daysBefore: number) => void;
  onTimeChange: (time: { hours: number; minutes: number }) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="visibleDaysBefore" className="text-sm font-medium text-text-secondary">
        Visible From
      </label>
      <p className="text-xs text-text-tertiary">
        When players can see and sign up for each game — e.g. 6 days before a Saturday kickoff at
        17:00 opens it the Sunday before at 5pm.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="visibleDaysBefore"
          type="number"
          min={0}
          max={60}
          value={visibility.daysBefore}
          onChange={(e) => onDaysBeforeChange(Math.max(0, Number(e.target.value)))}
          className={`${inputClass} w-24`}
        />
        <span className="text-sm text-text-secondary">days before, at</span>
        <input
          id="visibleTime"
          type="time"
          aria-label="Visible From Time"
          value={toTimeInput(visibility.hours, visibility.minutes)}
          onChange={(e) => {
            const time = parseTimeInput(e.target.value);
            if (time) onTimeChange(time);
          }}
          className={`${inputClass} w-36`}
        />
      </div>
    </div>
  );
}
