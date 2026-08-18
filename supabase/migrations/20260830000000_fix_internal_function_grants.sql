-- 20260828000000_lock_down_delete_avatar_file.sql only revoked EXECUTE
-- FROM PUBLIC, on the assumption these functions were reachable purely via
-- Postgres's default PUBLIC grant. They weren't: 20260823000000's blanket
-- `GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated,
-- service_role` had already granted EXECUTE directly to anon and
-- authenticated too, and a direct grant to a role survives a REVOKE FROM
-- PUBLIC. delete_avatar_file (and the other internal-only functions) were
-- therefore still callable by anon/authenticated after that migration.
REVOKE EXECUTE ON FUNCTION public.delete_avatar_file(TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_avatar_on_delete() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_avatar_on_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_group() FROM anon, authenticated;

-- Same issue for the new notification throttle function: it should stay
-- callable by authenticated (send-notification calls it with the caller's
-- own JWT) but not by anon.
REVOKE EXECUTE ON FUNCTION public.check_and_log_notification_send(UUID, TEXT, TEXT, INTEGER) FROM anon;
