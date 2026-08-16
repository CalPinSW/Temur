-- Enforces a real size/type limit on the avatars bucket server-side —
-- previously unset, so an oversized/wrong-type upload only failed once it
-- hit the platform's own project-level default, with no client-side
-- guardrail giving fast feedback either. Keep in sync with
-- packages/shared/src/utils/validation.ts's MAX_AVATAR_SIZE_BYTES /
-- ALLOWED_AVATAR_MIME_TYPES, which validate client-side before upload even
-- starts.
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';
