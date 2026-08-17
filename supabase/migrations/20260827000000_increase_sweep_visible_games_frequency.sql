-- Tightens the sweep-visible-games cron cadence from every 5 minutes to
-- every 1 minute, for lower notification latency on newly-visible games.
-- At this project's scale the added Edge Function invocation volume
-- (~43k/month vs ~8.6k/month) is still a small fraction of the free tier's
-- included quota, so this isn't a meaningful cost/usage-limit concern.
--
-- cron.schedule() with a job name matching an existing job updates that
-- job's schedule/command in place rather than creating a duplicate.
SELECT cron.schedule(
  'sweep-visible-games',
  '* * * * *',
  $$SELECT private.trigger_visible_games_sweep();$$
);
