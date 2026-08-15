'use client';

import { useActionState, useRef, useState } from 'react';
import { formatUsername, getInitials } from '@temur/shared';
import { updateProfile, type EditProfileState } from './actions';

const initialState: EditProfileState = {};

export function EditProfileForm({
  username,
  displayName: initialDisplayName,
  avatarUrl: initialAvatarUrl,
}: {
  username: string;
  displayName: string;
  avatarUrl: string;
}) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [previewUrl, setPreviewUrl] = useState(initialAvatarUrl);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(displayName, username);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        {previewUrl && !removeAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL / external Supabase Storage URL
          <img src={previewUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white">
            {initials}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            Change Photo
          </button>
          {previewUrl && !removeAvatar && (
            <button
              type="button"
              onClick={() => {
                setRemoveAvatar(true);
                setPreviewUrl('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-sm font-medium text-error hover:opacity-80"
            >
              Remove Photo
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) {
              setRemoveAvatar(false);
              setPreviewUrl(URL.createObjectURL(file));
            }
          }}
        />
        <input type="hidden" name="removeAvatar" value={removeAvatar ? 'true' : 'false'} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-text-secondary">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          maxLength={30}
          autoComplete="username"
          defaultValue={username}
          onChange={(e) => {
            e.currentTarget.value = formatUsername(e.currentTarget.value);
          }}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-text-secondary">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-lg border border-input-border bg-input px-3 py-2 text-text outline-none focus:border-primary"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-error-background px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
