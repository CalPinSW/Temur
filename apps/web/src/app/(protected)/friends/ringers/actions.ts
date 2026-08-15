'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';

export interface SavedRingerActionResult {
  error?: string;
  id?: string;
}

export async function addSavedRinger(name: string): Promise<SavedRingerActionResult> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Enter a name.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('saved_ringers')
    .upsert({ user_id: user.id, name: trimmedName }, { onConflict: 'user_id,name' })
    .select('id')
    .single();

  if (error) return { error: 'Failed to save ringer. Please try again.' };

  revalidatePath('/friends/ringers');
  return { id: data.id };
}

export async function deleteSavedRinger(ringerId: string): Promise<SavedRingerActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('saved_ringers').delete().eq('id', ringerId);

  if (error) return { error: 'Failed to remove ringer. Please try again.' };

  revalidatePath('/friends/ringers');
  return {};
}
