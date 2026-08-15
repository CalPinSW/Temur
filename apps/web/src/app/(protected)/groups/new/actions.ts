'use server';

import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';

export interface CreateGroupState {
  error?: string;
}

export async function createGroup(
  _prevState: CreateGroupState,
  formData: FormData
): Promise<CreateGroupState> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!name) {
    return { error: 'Group name is required.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, description: description || null, created_by: user.id })
    .select('id')
    .single();

  if (error) {
    return { error: 'Failed to create group. Please try again.' };
  }

  // The creator's own admin group_members row is inserted by the
  // handle_new_group() DB trigger, not here.
  redirect(`/groups/${data.id}`);
}
