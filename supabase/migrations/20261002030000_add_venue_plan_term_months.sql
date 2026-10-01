-- Stage 2: persist the selected venue plan duration so Venue Management
-- and Billing Center use the same plan-term model.
alter table public.venues
  add column if not exists plan_term_months integer;

alter table public.venues
  drop constraint if exists venues_plan_term_months_check;

alter table public.venues
  add constraint venues_plan_term_months_check
  check (plan_term_months is null or (plan_term_months >= 1 and plan_term_months <= 60));

update public.venues v
set plan_term_months = x.term_months
from (
  select distinct on (venue_id) venue_id, term_months
  from public.venue_billing_records
  where status = 'paid'
  order by venue_id, created_at desc
) x
where v.id = x.venue_id
  and (v.plan_term_months is null or v.plan_term_months <> x.term_months);

-- The live RPC definitions are updated separately during deployment so paid
-- billing records keep the venue's selected term in sync.
