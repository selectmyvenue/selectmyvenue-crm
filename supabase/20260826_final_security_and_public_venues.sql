-- Select My Venue production hardening
-- Apply from Supabase SQL Editor only after the matching website/CRM releases.
-- Safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- 1. Customer enquiries: public may submit; only active staff may read/manage.
--    This removes earlier overlapping policies that treated every authenticated
--    account as CRM staff (venue partners are authenticated too).
-- ---------------------------------------------------------------------------

alter table public.customer_enquiries enable row level security;

do $policy_cleanup$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_enquiries'
  loop
    execute format(
      'drop policy if exists %I on public.customer_enquiries',
      policy_row.policyname
    );
  end loop;
end
$policy_cleanup$;

create policy smv_public_submit_customer_enquiry
on public.customer_enquiries
for insert
to anon
with check (
  status = 'new'
  and customer_name is not null
  and length(btrim(customer_name)) between 2 and 120
  and mobile is not null
  and length(regexp_replace(mobile, '[^0-9]', '', 'g')) between 10 and 15
  and assigned_to is null
  and follow_up_at is null
  and internal_notes is null
  and last_contacted_at is null
  and lost_reason is null
  and lost_reason_other is null
  and venue_shared_at is null
  and site_visit_at is null
  and converted_at is null
  and contact_remark is null
);

create policy smv_active_staff_manage_customer_enquiries
on public.customer_enquiries
for all
to authenticated
using (public.smv_is_active_staff())
with check (public.smv_is_active_staff());

-- ---------------------------------------------------------------------------
-- 2. Partner assignment feed: returns only the assignment/customer fields that
--    a partner needs. SECURITY DEFINER bypasses customer table RLS only inside
--    this tightly scoped function and checks auth.uid() ownership in SQL.
-- ---------------------------------------------------------------------------

create or replace function public.smv_partner_get_assignments()
returns table (
  assignment jsonb,
  customer_enquiry jsonb
)
language sql
security definer
set search_path = ''
as $function$
  select
    jsonb_build_object(
      'id', a.id,
      'venue_id', a.venue_id,
      'enquiry_id', a.enquiry_id,
      'assignment_status', a.assignment_status,
      'assigned_at', a.assigned_at,
      'updated_at', a.updated_at,
      'follow_up_at', a.follow_up_at,
      'partner_note', a.partner_note,
      'lost_reason', a.lost_reason,
      'converted_at', a.converted_at,
      'site_visit_at', a.site_visit_at,
      'first_viewed_at', a.first_viewed_at,
      'last_activity_at', a.last_activity_at,
      'first_contacted_at', a.first_contacted_at
    ) as assignment,
    jsonb_build_object(
      'id', e.id,
      'customer_name', e.customer_name,
      'mobile', e.mobile,
      'email', e.email,
      'location', e.location,
      'occasion', e.occasion,
      'guests', e.guests,
      'budget_per_person', e.budget_per_person,
      'food_preference', e.food_preference,
      'event_date', e.event_date,
      'requirements', e.requirements,
      'source', e.source,
      'created_at', e.created_at
    ) as customer_enquiry
  from public.venue_enquiry_assignments a
  join public.customer_enquiries e
    on e.id = a.enquiry_id
  where exists (
    select 1
    from public.venue_partner_profiles p
    where p.user_id = (select auth.uid())
      and p.venue_id = a.venue_id
      and p.is_active = true
  )
  order by a.assigned_at desc;
$function$;

revoke all on function public.smv_partner_get_assignments() from public;
grant execute on function public.smv_partner_get_assignments() to authenticated;

-- Ensure partners may update only rows assigned to their own active venue.
drop policy if exists smv_partner_update_own_assignments
on public.venue_enquiry_assignments;

create policy smv_partner_update_own_assignments
on public.venue_enquiry_assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.venue_partner_profiles p
    where p.user_id = (select auth.uid())
      and p.venue_id = venue_enquiry_assignments.venue_id
      and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.venue_partner_profiles p
    where p.user_id = (select auth.uid())
      and p.venue_id = venue_enquiry_assignments.venue_id
      and p.is_active = true
  )
);

-- RLS controls rows, while this trigger protects CRM-only assignment columns.
create or replace function public.smv_protect_assignment_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(public.smv_is_active_staff(), false) then
    return new;
  end if;

  if not exists (
    select 1
    from public.venue_partner_profiles p
    where p.user_id = (select auth.uid())
      and p.venue_id = old.venue_id
      and p.is_active = true
  ) then
    raise exception 'Not authorised to update this assignment';
  end if;

  if new.id is distinct from old.id
    or new.venue_id is distinct from old.venue_id
    or new.enquiry_id is distinct from old.enquiry_id
    or new.assigned_by is distinct from old.assigned_by
    or new.assigned_at is distinct from old.assigned_at
    or new.created_at is distinct from old.created_at
    or new.internal_note is distinct from old.internal_note
    or new.assignment_note is distinct from old.assignment_note
  then
    raise exception 'Partner cannot change protected assignment fields';
  end if;

  return new;
end;
$function$;

drop trigger if exists smv_protect_assignment_admin_fields
on public.venue_enquiry_assignments;

create trigger smv_protect_assignment_admin_fields
before update on public.venue_enquiry_assignments
for each row
execute function public.smv_protect_assignment_admin_fields();

-- Controlled partner activity inserts.
drop policy if exists smv_partner_insert_own_activity
on public.venue_activity_log;

create policy smv_partner_insert_own_activity
on public.venue_activity_log
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.venue_partner_profiles p
    where p.user_id = (select auth.uid())
      and p.venue_id = venue_activity_log.venue_id
      and p.is_active = true
  )
  and exists (
    select 1
    from public.venue_enquiry_assignments a
    where a.id = venue_activity_log.assignment_id
      and a.venue_id = venue_activity_log.venue_id
  )
);

-- Backfill summary timestamps from the persistent activity already recorded.
with activity_summary as (
  select
    assignment_id,
    min(created_at) filter (where activity_type = 'viewed') as first_viewed_at,
    min(created_at) filter (
      where activity_type in (
        'contacted',
        'whatsapp_shared',
        'call_connected',
        'details_shared',
        'detailed_shared'
      )
    ) as first_contacted_at,
    max(created_at) as last_activity_at
  from public.venue_activity_log
  group by assignment_id
)
update public.venue_enquiry_assignments a
set
  first_viewed_at = coalesce(a.first_viewed_at, s.first_viewed_at),
  first_contacted_at = coalesce(a.first_contacted_at, s.first_contacted_at),
  last_activity_at = greatest(a.last_activity_at, s.last_activity_at),
  updated_at = now()
from activity_summary s
where a.id = s.assignment_id;

-- ---------------------------------------------------------------------------
-- 3. Public venue directory: verified and approved rows, safe columns only.
-- ---------------------------------------------------------------------------

create or replace function public.smv_public_venues()
returns table (venue jsonb)
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'id', v.id,
    'venue_name', v.venue_name,
    'venue_type', v.venue_type,
    'description', v.description,
    'city', v.city,
    'area', v.area,
    'capacity_min', v.capacity_min,
    'capacity_max', v.capacity_max,
    'price_min_per_person', v.price_min_per_person,
    'price_max_per_person', v.price_max_per_person,
    'food_veg', v.food_veg,
    'food_non_veg', v.food_non_veg,
    'parking_available', v.parking_available,
    'rooms_available', v.rooms_available,
    'google_maps_url', v.google_maps_url,
    'featured', v.featured
  ) as venue
  from public.venues v
  where v.venue_status = 'approved'
    and v.verification_status = 'verified'
  order by v.featured desc, v.venue_name asc;
$function$;

revoke all on function public.smv_public_venues() from public;
grant execute on function public.smv_public_venues() to anon, authenticated;

-- Public clients must use the safe RPC above, not query all venue columns.
revoke select on table public.venues from anon;

commit;

-- Verification checks (read-only; run after the transaction if desired):
-- select policyname, cmd, roles from pg_policies
-- where schemaname = 'public' and tablename = 'customer_enquiries';
-- select * from public.smv_public_venues();
