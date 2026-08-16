import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { DeleteAccountForm } from './DeleteAccountForm';

export default async function DeleteAccountPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Delete Account</h1>
      <DeleteAccountForm username={profile?.username ?? ''} email={user.email ?? ''} />
    </div>
  );
}
