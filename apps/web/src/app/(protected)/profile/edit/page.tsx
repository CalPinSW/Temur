import { createClient, getUser } from '@/lib/supabase/server';
import { EditProfileForm } from './EditProfileForm';

export default async function EditProfilePage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user!.id)
    .single();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Edit Profile</h1>
      <EditProfileForm
        username={profile?.username ?? ''}
        displayName={profile?.display_name ?? ''}
        avatarUrl={profile?.avatar_url ?? ''}
      />
    </div>
  );
}
