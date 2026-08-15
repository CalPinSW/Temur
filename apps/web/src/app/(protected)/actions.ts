'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signOut() {
  const supabase = await createClient();
  // Supabase's default scope is 'global', which revokes every session for
  // this user across every device — signing out on web would also kick you
  // out of mobile (and vice versa). 'local' only ends this session.
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
}
