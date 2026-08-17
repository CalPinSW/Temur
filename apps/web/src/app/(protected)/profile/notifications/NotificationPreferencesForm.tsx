'use client';

import { Fragment, useState, useTransition } from 'react';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  type NotificationChannel,
  type NotificationPreferences,
  type NotificationType,
} from '@temur/shared';
import { useToast } from '@/components/toast/ToastProvider';
import { setAllNotificationPreferences, setNotificationPreference } from './actions';

const CHANNELS: { channel: NotificationChannel; label: string }[] = [
  { channel: 'push_enabled', label: 'Push' },
  { channel: 'email_enabled', label: 'Email' },
];

export function NotificationPreferencesForm({
  initialPreferences,
}: {
  initialPreferences: NotificationPreferences;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const handleToggle = (type: NotificationType, channel: NotificationChannel, value: boolean) => {
    const previous = preferences;
    const current = preferences[type];
    setPreferences({ ...preferences, [type]: { ...current, [channel]: value } });

    startTransition(async () => {
      const { success } = await setNotificationPreference(type, current, channel, value);
      if (!success) {
        setPreferences(previous);
        showToast('Failed to update notification preference');
      }
    });
  };

  const handleToggleAll = (channel: NotificationChannel, value: boolean) => {
    const previous = preferences;
    const next = Object.fromEntries(
      NOTIFICATION_TYPES.map((type) => [type, { ...preferences[type], [channel]: value }])
    ) as NotificationPreferences;
    setPreferences(next);

    startTransition(async () => {
      const { success } = await setAllNotificationPreferences(previous, channel, value);
      if (!success) {
        setPreferences(previous);
        showToast('Failed to update notification preferences');
      }
    });
  };

  return (
    <div
      className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-card px-4 py-3"
      aria-disabled={isPending}
    >
      <span />
      {CHANNELS.map(({ channel, label }) => (
        <span
          key={channel}
          className="text-center text-xs font-semibold tracking-wide text-text-tertiary"
        >
          {label}
        </span>
      ))}

      <span className="font-medium text-text">Select all</span>
      {CHANNELS.map(({ channel, label }) => (
        <input
          key={channel}
          type="checkbox"
          aria-label={`Select all ${label}`}
          className="justify-self-center"
          checked={NOTIFICATION_TYPES.every((type) => preferences[type][channel])}
          disabled={isPending}
          onChange={(event) => handleToggleAll(channel, event.target.checked)}
        />
      ))}

      <div className="col-span-3 border-t border-border-light" />

      {NOTIFICATION_TYPES.map((type) => (
        <Fragment key={type}>
          <span className="text-text">{NOTIFICATION_TYPE_LABELS[type]}</span>
          {CHANNELS.map(({ channel, label }) => (
            <input
              key={channel}
              type="checkbox"
              aria-label={`${NOTIFICATION_TYPE_LABELS[type]} — ${label}`}
              className="justify-self-center"
              checked={preferences[type][channel]}
              disabled={isPending}
              onChange={(event) => handleToggle(type, channel, event.target.checked)}
            />
          ))}
        </Fragment>
      ))}
    </div>
  );
}
