-- Security hardening: restrict global trial-status refresh to active CRM admins.
-- This migration was applied to Supabase project uajqwyoqbbswkfiwosyw
-- under migration version 20261021184341. Keep existing expiry behavior.

begin;

create or replace function public.smv_refresh_trial_statuses()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  changed integer := 0;
begin
  if not coalesce(public.smv_is_active_staff(), false) then
    raise exception 'Administrator access required'
      using errcode = '42501';
  end if;

  update public.venues
  set plan_status = 'expired'
  where partner_plan = 'launch_trial'
    and plan_status = 'trialing'
    and plan_expires_at is not null
    and plan_expires_at <= now();

  get diagnostics changed = row_count;
  return changed;
end;
$function$;

revoke all on function public.smv_refresh_trial_statuses() from public, anon;
grant execute on function public.smv_refresh_trial_statuses() to authenticated;

commit;

-- Read-only verification:
-- SELECT p.prosecdef, p.proconfig, p.proacl::text
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'smv_refresh_trial_statuses';
