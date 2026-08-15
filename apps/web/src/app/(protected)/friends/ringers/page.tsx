import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { SavedRingersList } from './SavedRingersList';

export default async function SavedRingersPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const { data } = await supabase
    .from('saved_ringers')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Saved Ringers</h1>
      <SavedRingersList initialRingers={data ?? []} />
    </div>
  );
}
