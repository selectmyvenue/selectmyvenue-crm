-- Plan Center expiry consistency and refresh workflow.
-- Safe to apply after review; this file does not alter customer_enquiries or its RLS.

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

  -- Treat the stored UTC date as an inclusive calendar date in India,
  -- matching the Plan Center's date-only display. Expire on the following
  -- India calendar day, not at 05:30 IST on the displayed expiry date.
  update public.venues
  set plan_status = 'expired'
  where partner_plan = 'launch_trial'
    and plan_status in ('trialing', 'active')
    and plan_expires_at is not null
    and (plan_expires_at at time zone 'UTC')::date
        < (now() at time zone 'Asia/Kolkata')::date;

  get diagnostics changed = row_count;
  return changed;
end;
$function$;

revoke all on function public.smv_refresh_trial_statuses() from public, anon;
grant execute on function public.smv_refresh_trial_statuses() to authenticated;

commit;
