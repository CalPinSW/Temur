import Link from 'next/link';
import { type GroupWithRole } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

interface RawGroupMember {
  role: GroupWithRole['myRole'];
  group: GroupWithRole;
}

export default async function GroupsPage() {
  const user = await getUser();
  const supabase = await createClient();

  const [{ data: memberRows, error }, { count: inviteCount }] = await Promise.all([
    supabase.from('group_members').select('role, group:groups(*)').eq('user_id', user!.id),
    supabase
      .from('group_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('invited_user_id', user!.id),
  ]);

  if (error) throw error;

  const groups: GroupWithRole[] = ((memberRows as unknown as RawGroupMember[]) ?? [])
    .map((row) => ({ ...row.group, myRole: row.role }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Groups</h1>
        <Link
          href="/groups/new"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          + Create
        </Link>
      </div>

      {!!inviteCount && (
        <Link
          href="/groups/invites"
          className="flex items-center justify-between rounded-lg bg-background-secondary px-4 py-3 transition-colors hover:bg-input"
        >
          <span className="font-medium text-text">
            {inviteCount} pending group invite{inviteCount > 1 ? 's' : ''}
          </span>
          <span className="text-primary">›</span>
        </Link>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No groups yet.{' '}
          <Link href="/groups/new" className="font-medium text-primary hover:text-primary-hover">
            Create a group
          </Link>{' '}
          to start organizing games with your regulars.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border bg-card">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-background-secondary"
            >
              <div className="flex flex-1 flex-col">
                <span className="font-medium text-text">{group.name}</span>
                {group.description && (
                  <span className="text-sm text-text-secondary">{group.description}</span>
                )}
              </div>
              {group.myRole === 'admin' && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Admin
                </span>
              )}
              <span className="text-text-tertiary">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
