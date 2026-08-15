import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getInitials } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  const isEmailUser = user?.app_metadata?.provider === 'email' || !user?.app_metadata?.provider;
  const initials = getInitials(profile?.display_name, profile?.username);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-8">
      <div className="flex flex-col items-center gap-1">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, no next/image domain config
          <img
            src={profile.avatar_url}
            alt=""
            className="mb-3 h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white">
            {initials}
          </div>
        )}
        <span className="text-xl font-bold text-text">
          {profile?.display_name || profile?.username || 'User'}
        </span>
        <span className="text-text-secondary">@{profile?.username}</span>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-text-tertiary">ACCOUNT</h2>
        <nav className="flex flex-col divide-y divide-border-light rounded-lg border border-border bg-card">
          <Link href="/profile/edit" className="px-4 py-3 text-text hover:bg-background-secondary">
            Edit Profile
          </Link>
          {isEmailUser && (
            <Link
              href="/profile/change-password"
              className="px-4 py-3 text-text hover:bg-background-secondary"
            >
              Change Password
            </Link>
          )}
          {process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL && (
            <a
              href={process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 text-text hover:bg-background-secondary"
            >
              Privacy Policy
            </a>
          )}
        </nav>
      </section>

      {process.env.NEXT_PUBLIC_SUPPORT_EMAIL && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-text-tertiary">SUPPORT</h2>
          <nav className="flex flex-col rounded-lg border border-border bg-card">
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
              className="px-4 py-3 text-text hover:bg-background-secondary"
            >
              Contact Support
            </a>
          </nav>
        </section>
      )}
    </div>
  );
}
