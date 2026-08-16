-- Older Supabase Postgres bootstrap images granted anon/authenticated/
-- service_role base object-level privileges on the public schema as part of
-- their own init scripts. Some newer image tags (bundled with recent
-- supabase CLI versions) don't, which surfaces as "permission denied for
-- table X" (Postgres error 42501) on a freshly bootstrapped local stack —
-- even though RLS is correctly enabled everywhere. RLS only ever narrows
-- access on top of these base grants; it never substitutes for them. This
-- migration makes the schema self-sufficient regardless of which bootstrap
-- image a given CLI version ships.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
