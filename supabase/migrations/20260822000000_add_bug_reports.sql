-- Bug reports: a user-submitted description plus diagnostic context
-- (platform, app version, current screen, recent uncaught errors — see
-- the send-bug-report edge function), persisted so a report survives even
-- if the email delivery fails, and emailed to support immediately via the
-- same Resend path as notification emails. No admin UI reads this table
-- yet — it exists so reports aren't lost, not for a dashboard.
CREATE TABLE bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bug reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bug reports"
  ON bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
