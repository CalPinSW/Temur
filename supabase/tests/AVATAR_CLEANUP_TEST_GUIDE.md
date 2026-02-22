# Avatar Cleanup Testing Guide

This guide documents the avatar cleanup functionality and its limitations.

## Current Status: ⚠️ Known Limitation

**Automatic avatar cleanup via database triggers is NOT currently working** due to Supabase storage RLS limitations.

### The Issue

Database triggers that attempt to automatically delete old avatar files from Supabase Storage face a fundamental limitation:
- Supabase's `storage.objects` table has Row Level Security (RLS) enabled
- Even `SECURITY DEFINER` functions owned by the `postgres` superuser cannot bypass these RLS policies
- This is a known limitation of Supabase's storage implementation

### What Was Attempted

Database triggers were implemented to automatically delete old avatar files when:
1. **Profile Update**: When a user changes their `avatar_url`, the old avatar file should be deleted
2. **User Deletion**: When a user is deleted, their avatar file should be deleted

However, these triggers cannot execute the deletions due to RLS restrictions.

## Migration Details

- **File**: `supabase/migrations/20260201000300_avatar_cleanup_triggers.sql`
- **Functions Created**:
  - `extract_avatar_path(avatar_url TEXT)` - Extracts file path from public URL
  - `delete_avatar_file(avatar_url TEXT)` - Deletes file from storage
  - `cleanup_old_avatar_on_update()` - Trigger function for updates
  - `cleanup_avatar_on_delete()` - Trigger function for deletions

## Manual Testing Steps

### Test 1: Avatar Change Cleanup

1. **Start local Supabase** (if not already running):
   ```bash
   supabase start
   ```

2. **Create a test user** in the app and upload an avatar

3. **Verify the avatar exists** in Supabase Dashboard:
   - Go to Storage → avatars bucket
   - You should see a file like `{user-id}-{timestamp}.jpg`

4. **Upload a new avatar** for the same user

5. **Verify old avatar was deleted**:
   - Check the avatars bucket again
   - Only the new avatar file should exist
   - The old file should be automatically deleted

### Test 2: User Deletion Cleanup

1. **Create a test user** with an avatar

2. **Note the avatar filename** in Storage → avatars bucket

3. **Delete the user** from the database:
   ```sql
   -- In Supabase SQL Editor
   DELETE FROM auth.users WHERE id = 'user-id-here';
   ```

4. **Verify avatar was deleted**:
   - Check the avatars bucket
   - The avatar file should be gone

### Test 3: No Avatar Change

1. **Create a test user** with an avatar

2. **Update the user's profile** (display_name, username, etc.) **without changing avatar_url**

3. **Verify avatar still exists**:
   - The avatar file should remain in storage
   - Only changes to `avatar_url` trigger cleanup

## Automated Tests

To run the automated test suite (requires Deno):

```bash
# Install Deno if not already installed
curl -fsSL https://deno.land/install.sh | bash

# Start local Supabase
supabase start

# Run tests
cd supabase/tests
deno test --allow-net --allow-env avatar-cleanup.test.ts
```

## Verification Queries

Check if triggers are installed:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%avatar%';
```

Check if functions exist:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%avatar%'
  AND routine_schema = 'public';
```

## Expected Results

- ✅ Old avatar files are automatically deleted when users upload new avatars
- ✅ Avatar files are deleted when users are removed from the database
- ✅ No errors occur during profile updates that don't change avatars
- ✅ Storage bucket remains clean without orphaned files
