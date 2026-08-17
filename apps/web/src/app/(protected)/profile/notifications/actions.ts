'use server';

import { revalidatePath } from 'next/cache';
import {
  NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationPreferences,
  type NotificationType,
} from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

export async function setNotificationPreference(
  type: NotificationType,
  current: NotificationPreferences[NotificationType],
  channel: NotificationChannel,
  enabled: boolean
): Promise<{ success: boolean }> {
  const user = await getUser();
  if (!user) return { success: false };

  const supabase = await createClient();
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: user.id,
      notification_type: type,
      push_enabled: channel === 'push_enabled' ? enabled : current.push_enabled,
      email_enabled: channel === 'email_enabled' ? enabled : current.email_enabled,
    },
    { onConflict: 'user_id,notification_type' }
  );

  revalidatePath('/profile/notifications');
  return { success: !error };
}

export async function setAllNotificationPreferences(
  current: NotificationPreferences,
  channel: NotificationChannel,
  enabled: boolean
): Promise<{ success: boolean }> {
  const user = await getUser();
  if (!user) return { success: false };

  const supabase = await createClient();
  const { error } = await supabase.from('notification_preferences').upsert(
    NOTIFICATION_TYPES.map((type) => ({
      user_id: user.id,
      notification_type: type,
      push_enabled: channel === 'push_enabled' ? enabled : current[type].push_enabled,
      email_enabled: channel === 'email_enabled' ? enabled : current[type].email_enabled,
    })),
    { onConflict: 'user_id,notification_type' }
  );

  revalidatePath('/profile/notifications');
  return { success: !error };
}
