# Trial-status refresh: security review

## Finding

The live `public.smv_refresh_trial_statuses()` function was `SECURITY DEFINER`
and checked only that `auth.uid()` was non-null before updating expired
`launch_trial` venue records across the project. This allowed any signed-in
account to attempt a project-wide lifecycle update.

## Fix applied

Migration version `20261021184341` (`restrict_trial_status_refresh_to_admin`)
was applied to the live Supabase project on 2026-10-21. The function now checks
`public.smv_is_active_staff()` and raises SQLSTATE `42501` unless the caller
is an active administrator. The existing trial-expiry criteria are unchanged.
The function ACL now explicitly lists `postgres`, `authenticated`, and
`service_role`; it does not list `anon` or `PUBLIC`.

## Verification completed

- Read back the live function definition and confirmed the administrator guard,
  SQLSTATE `42501`, `SECURITY DEFINER`, and empty `search_path`.
- Read back the function ACL and confirmed no explicit `anon` or `PUBLIC`
  execution grant.
- Invoked the RPC from the SQL execution context without an authenticated user;
  it was rejected with SQLSTATE `42501` and `Administrator access required`.
- Checked the Supabase migration list and confirmed version
  `20261021184341` is recorded.

## Verification still pending

- Call the RPC from a real active-admin browser session and confirm success.
- Call from a real partner/non-admin session and confirm rejection. The SQL
  context denial proves the guard rejects a caller without an admin identity,
  but does not replace this authenticated test.
- Re-run advisors after their findings refresh.
- Complete the separate two-partner data-isolation test when a second authorized
  partner login is available.

## Other Supabase advisor findings

These remain separate from this narrowly scoped fix:

- `public.smv_block_inactive_venue_assignment()`: advisor flags anon and
  authenticated execution. Confirm trigger wiring before adjusting privileges.
- `public.smv_is_venue_assignment_eligible(uuid)`: returns venue eligibility;
  confirm whether public execution is required by callers.
- `public.smv_partner_sync_plan_expiry()`: partner-scoped function whose body
  checks active venue context; anonymous execution should be reviewed.
- `public.smv_public_venues()`: public, safe-column directory filtered to
  approved, verified, public-enabled venues; public execution appears intended.
- `public.smv_sync_venue_plan_expiry(uuid)`: function body checks active-admin
  authorization before updating.
- Supabase flagged `geocode_cache` and `route_distance_cache` for RLS enabled
  with no policies, `pg_net` installed in `public`, and leaked-password
  protection disabled. These need separate review and are not changed here.

## Safety boundary

Only the trial-status refresh function definition and its execute grants were
changed. No customer enquiry data, `customer_enquiries` schema, table RLS
policies, or website deployment was changed. Partner isolation testing remains
pending.
