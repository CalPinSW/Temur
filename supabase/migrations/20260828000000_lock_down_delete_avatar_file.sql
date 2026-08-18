-- delete_avatar_file is SECURITY DEFINER and performs a real side effect
-- (DELETE FROM storage.objects) with no ownership/admin check on the caller
-- — it's only meant to run internally, as a side effect of the avatar
-- cleanup triggers below it. Postgres grants EXECUTE to PUBLIC by default
-- on function creation, and no earlier migration ever revoked that, so
-- anon/authenticated could call it directly via
-- /rest/v1/rpc/delete_avatar_file with an arbitrary avatar_url and delete
-- any other user's avatar file (avatar_url is readable via the profiles
-- table by any authenticated user).
REVOKE EXECUTE ON FUNCTION public.delete_avatar_file(TEXT) FROM PUBLIC;

-- Defense in depth: these are trigger-only/internal functions never meant
-- to be invoked directly via RPC either. Triggers don't need EXECUTE
-- granted to the triggering role, so this doesn't affect their normal
-- operation.
REVOKE EXECUTE ON FUNCTION public.cleanup_avatar_on_delete() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_avatar_on_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_group() FROM PUBLIC;
