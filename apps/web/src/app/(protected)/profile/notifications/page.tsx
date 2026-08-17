import { redirect } from 'next/navigation';
import { mergeNotificationPreferences, type NotificationPreferenceRow } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { NotificationPreferencesForm } from './NotificationPreferencesForm';

export default async function NotificationPreferencesPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const { data } = await supabase
    .from('notification_preferences')
    .select('notification_type, push_enabled, email_enabled')
    .eq('user_id', user.id);

  const preferences = mergeNotificationPreferences((data ?? []) as NotificationPreferenceRow[]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text">Notifications</h1>
        <p className="text-sm text-text-secondary">
          Choose how you&apos;d like to be notified for each type of activity.
        </p>
      </div>
      <NotificationPreferencesForm initialPreferences={preferences} />
    </div>
  );
}
