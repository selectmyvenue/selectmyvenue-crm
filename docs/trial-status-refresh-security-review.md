# Trial-status refresh: security review

## Finding

The live `public.smv_refresh_trial_statuses()` function was `SECURITY DEFINER`
and executable by `anon` and `authenticated`. Its body updated expired
`launch_trial` venue records across the project and checked only that
`auth.uid()` was non-null. Any signed-in account could therefore invoke a
project-wide lifecycle update.

## Proposed fix

Migration `20261021200000_restrict_trial_status_refresh_to_admin.sql` adds an
active-administrator authorization check using
`public.smv_is_active_staff()`, revokes execution from `PUBLIC` and `anon`,
and retains authenticated execution for the existing CRM caller. The existing
trial-expiry criteria and update behavior are unchanged. The service-role
grant is left unchanged.

## Other Supabase advisor findings reviewed

- `public.smv_block_inactive_venue_assignment()`: trigger-returning function;
  execution exposure is unnecessary for ordinary clients and should be removed
  in a separate reviewed change only after confirming trigger wiring. This
  function must still remain executable by the role that runs the trigger.
- `public.smv_is_venue_assignment_eligible(uuid)`: returns only whether a venue
  is approved and verified. Public execution may be intentional, but should be
  confirmed against callers before restricting it.
- `public.smv_partner_sync_plan_expiry()`: partner-scoped lifecycle function;
  its body selects the caller's active venue and rejects callers without one.
  Anonymous execution is unnecessary and should be revoked after confirming
  the frontend uses only authenticated sessions.
- `public.smv_public_venues()`: returns a deliberate safe-column public venue
  directory and filters to approved, verified, public-enabled venues. Public
  execution appears intentional.
- `public.smv_sync_venue_plan_expiry(uuid)`: body checks
  `smv_is_active_staff()` before updating and therefore has an admin guard;
  its broad execute grant is not, by itself, evidence of an authorization bypass.
- `public.smv_admin_analytics()`, `public.smv_assignment_venues()`,
  `public.smv_is_active_staff()`, and notification/follow-up RPCs should be
  judged by their in-function authorization checks and expected client usage,
  not blanket-revoked based only on the advisor warning.
- Supabase also flagged `geocode_cache` and `route_distance_cache` for RLS
  enabled with no policies, `pg_net` installed in `public`, and leaked-password
  protection disabled. These need separate exposure/configuration review; this
  PR does not alter them.

## Verification plan

1. Apply the migration only after review/approval; this branch does not change
   the live database.
2. Confirm the function definition contains the administrator guard and its
   ACL no longer permits `anon` / `PUBLIC`.
3. With an authorized admin session, call the RPC and confirm it completes.
4. With a partner or ordinary authenticated non-admin session, call the RPC
   and confirm SQLSTATE `42501` is returned and no venue plan status changes.
5. Re-run Supabase security advisors.
6. Complete the separate two-partner isolation test when a second authorized
   partner login is available.

## Safety boundary

No production SQL was executed by this change. No venue plan statuses, customer
enquiries, RLS policies, or production deployments were modified.
