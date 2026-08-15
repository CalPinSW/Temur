-- Adds every table the app subscribes to via `postgres_changes` to the
-- `supabase_realtime` publication. No migration has ever done this before —
-- on the remote project, realtime currently "works" only because someone
-- manually toggled replication on for these tables via the Dashboard
-- (Database > Replication), an unmigrated, unreproducible piece of config.
-- A fresh project (and the local Supabase stack, until now) has none of
-- these tables published, so `postgres_changes` silently never fires.
--
-- ADD TABLE is a no-op-unsafe operation (errors if the table is already a
-- member), so this loops with an existence check rather than a flat list of
-- ALTER PUBLICATION statements — safe to run against a remote project that
-- may already have some of these toggled on manually.
--
-- Also sets REPLICA IDENTITY FULL: the default (primary key only) means
-- UPDATE/DELETE change events only carry the row's id, not the other
-- columns — every RLS SELECT policy on these tables filters on non-PK
-- columns (e.g. friendships' `auth.uid() = user_id OR auth.uid() =
-- friend_id`), so without FULL, RLS can't evaluate those events and they'd
-- silently never reach a subscriber.
DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'friendships',
    'group_invitations',
    'game_invitations',
    'games',
    'player_games',
    'groups',
    'group_members'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', target_table);

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = target_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target_table);
    END IF;
  END LOOP;
END $$;
