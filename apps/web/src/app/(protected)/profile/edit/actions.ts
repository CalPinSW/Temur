'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validateUsername, validateAvatarFile, getAvatarUploadErrorMessage } from '@temur/shared';
import { createClient, getUser } from '@/lib/supabase/server';

export interface EditProfileState {
  error?: string;
}

export async function updateProfile(
  _prevState: EditProfileState,
  formData: FormData
): Promise<EditProfileState> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const displayName = String(formData.get('displayName') ?? '').trim();
  const username = String(formData.get('username') ?? '').trim();
  const avatarFile = formData.get('avatar');
  const removeAvatar = formData.get('removeAvatar') === 'true';

  const usernameError = validateUsername(username);
  if (usernameError) {
    return { error: usernameError };
  }

  const supabase = await createClient();

  let avatarUrl: string | null | undefined;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    // Server-side backstop — the client already checks this for instant
    // feedback, but never trust client-only validation.
    const fileValidationError = validateAvatarFile(avatarFile.size, avatarFile.type);
    if (fileValidationError) {
      return { error: fileValidationError };
    }

    const fileExt = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const contentType = avatarFile.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { contentType, upsert: true });

    if (uploadError) {
      return { error: getAvatarUploadErrorMessage(uploadError) };
    }

    avatarUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
  } else if (removeAvatar) {
    avatarUrl = null;
  }

  const updates: Record<string, string | null> = {
    display_name: displayName || null,
  };
  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl;
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (username !== currentProfile?.username) {
    updates.username = username;
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

  if (error) {
    if (error.code === '23505') {
      return { error: 'This username is already taken.' };
    }
    return { error: error.message };
  }

  revalidatePath('/profile');
  redirect('/profile');
}
