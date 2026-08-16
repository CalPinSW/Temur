'use server';

import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';

export interface DeleteAccountState {
  error?: string;
}

export async function deleteAccount(
  _prevState: DeleteAccountState
): Promise<DeleteAccountState> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase.functions.invoke('delete-account');

  if (error) {
    return { error: 'Failed to delete your account. Please try again.' };
  }

  // 'local' scope only ends this session — see (protected)/actions.ts's
  // signOut for why 'global' (the default) would be wrong here too, even
  // though the account no longer exists to have other sessions on.
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
}
