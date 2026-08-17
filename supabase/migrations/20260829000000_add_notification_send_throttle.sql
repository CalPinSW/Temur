-- Nothing previously stopped a caller from invoking the send-notification
-- edge function directly (bypassing the app's UI) many times in a row for
-- the same target+type, spamming a user with repeated push notifications
-- and support-cost emails. This gives it a short per
-- (caller, target, type, entity) cooldown: check_and_log_notification_send
-- is called before sending, logs the attempt, and returns false if an
-- identical send already happened within the cooldown window. The advisory
-- lock closes the race where a burst of concurrent calls could all pass the
-- "already sent?" check before any of them logs its own attempt.
CREATE TABLE notification_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  entity_key TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_send_log_lookup
  ON notification_send_log (caller_id, target_user_id, notification_type, entity_key, sent_at DESC);

-- No policies: only reachable through check_and_log_notification_send
-- (SECURITY DEFINER) or the service role, never directly by a client.
ALTER TABLE notification_send_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_and_log_notification_send(
  p_target_user_id UUID,
  p_notification_type TEXT,
  p_entity_key TEXT DEFAULT '',
  p_cooldown_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN FALSE;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_caller_id::TEXT || p_target_user_id::TEXT || p_notification_type || p_entity_key, 0)
  );

  IF EXISTS (
    SELECT 1 FROM public.notification_send_log
    WHERE caller_id = v_caller_id
      AND target_user_id = p_target_user_id
      AND notification_type = p_notification_type
      AND entity_key = p_entity_key
      AND sent_at > NOW() - (p_cooldown_seconds || ' seconds')::INTERVAL
  ) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.notification_send_log (caller_id, target_user_id, notification_type, entity_key)
  VALUES (v_caller_id, p_target_user_id, p_notification_type, p_entity_key);

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_log_notification_send(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_log_notification_send(UUID, TEXT, TEXT, INTEGER) TO authenticated;
