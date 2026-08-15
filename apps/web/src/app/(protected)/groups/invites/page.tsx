import { redirect } from 'next/navigation';
import { type GroupInvitationWithDetails } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';
import { InvitesList } from './InvitesList';

export default async function GroupInvitesPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('group_invitations')
    .select(
      'id, group_id, invited_by, invited_user_id, created_at, group:groups(id, name), inviter:profiles!group_invitations_invited_by_fkey(id, username, display_name)'
    )
    .eq('invited_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Group Invites</h1>
      <InvitesList initialInvitations={(data ?? []) as unknown as GroupInvitationWithDetails[]} />
    </div>
  );
}
