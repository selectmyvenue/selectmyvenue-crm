-- 2026-09-24: safe CRM maintenance automation
-- Launch-trial lifecycle dates + deterministic expiry refresh.
-- Public listing / venue approval / verification are intentionally NOT changed.

create or replace function public.smv_set_trial_dates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.partner_plan = 'launch_trial' and coalesce(new.plan_status,'trialing') = 'trialing' then
    if new.plan_started_at is null then new.plan_started_at := now(); end if;
    if new.plan_expires_at is null then new.plan_expires_at := new.plan_started_at + interval '10 days'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists smv_set_trial_dates on public.venues;
create trigger smv_set_trial_dates
before insert or update of partner_plan, plan_status, plan_started_at, plan_expires_at
on public.venues
for each row execute function public.smv_set_trial_dates();

create or replace function public.smv_refresh_trial_statuses()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare changed integer := 0;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  update public.venues
     set plan_status = 'expired'
   where partner_plan = 'launch_trial'
     and plan_status = 'trialing'
     and plan_expires_at is not null
     and plan_expires_at <= now();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.smv_refresh_trial_statuses() from public, anon;
grant execute on function public.smv_refresh_trial_statuses() to authenticated;

revoke all on table public.geocode_cache from anon, authenticated;
revoke all on table public.route_distance_cache from anon, authenticated;
