-- Notification infra: visibility-sweep tracking, per-group message template,
-- and the pg_cron job that periodically sweeps newly-visible group games.

-- ============================================
-- VISIBILITY SWEEP TRACKING
-- ============================================
-- Tracks whether the "game is now visible, go sign up" push has already been
-- sent for a game, so the periodic sweep below doesn't re-notify it.
ALTER TABLE games ADD COLUMN visibility_notified_at TIMESTAMPTZ;

CREATE INDEX idx_games_visibility_sweep
  ON games (visible_at)
  WHERE visibility_notified_at IS NULL;

-- No RLS policy change needed: the sweep only ever writes this column via a
-- service-role client, which bypasses RLS entirely.

-- ============================================
-- PER-GROUP TEAM-ASSIGNMENT MESSAGE TEMPLATE
-- ============================================
-- Default message text group admins configure, used to pre-fill the "notify
-- players of their team" dialog on a game.
ALTER TABLE groups ADD COLUMN team_assignment_message_template TEXT;

-- No new RLS policy needed: the existing "Group admins can update groups"
-- UPDATE policy (is_group_admin(id, auth.uid())) already covers this column.

-- ============================================
-- pg_cron / pg_net
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- CRON -> EDGE FUNCTION WIRING
-- The shared secret and functions base URL are read from Supabase Vault by
-- name rather than embedded here, so no secret value is ever committed.
-- Provision them once per environment, out-of-band, e.g. via the SQL editor:
--   select vault.create_secret('<value of EDGE_FUNCTION_SECRET>', 'edge_function_secret');
--   select vault.create_secret('<project functions base url>', 'project_functions_url');
-- If either secret is missing, the sweep silently no-ops (RAISE WARNING) so a
-- misconfigured environment fails soft rather than breaking the cron job.
-- ============================================
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.trigger_visible_games_sweep()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret TEXT;
  v_url TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'edge_function_secret';
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'project_functions_url';

  IF v_secret IS NULL OR v_url IS NULL THEN
    RAISE WARNING 'visible-games sweep: missing vault secret(s), skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/sweep-visible-games',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
END;
$$;

-- private schema is not in supabase/config.toml's exposed api.schemas, so
-- this function is not reachable via PostgREST.

SELECT cron.schedule(
  'sweep-visible-games',
  '*/5 * * * *',
  $$SELECT private.trigger_visible_games_sweep();$$
);
