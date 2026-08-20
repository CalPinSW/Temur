-- 20260834000000 revoked EXECUTE on the two auth-required join-link
-- functions FROM anon, but missed that CREATE FUNCTION also grants EXECUTE
-- TO PUBLIC by default — and, per 20260830000000_fix_internal_function_grants
-- .sql's own finding, a role inherits PUBLIC's grant regardless of an
-- explicit REVOKE against that role specifically. The Supabase security
-- advisor caught it: both were still anon-executable via the PUBLIC grant.
-- get_group_join_link_info is deliberately anon-callable (the pre-auth link
-- preview) and is left untouched.
REVOKE EXECUTE ON FUNCTION public.get_or_create_group_join_link(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_group_via_link(TEXT) FROM PUBLIC;
