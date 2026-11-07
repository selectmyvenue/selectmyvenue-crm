-- Partner-confirmed availability for assigned customer enquiries.
-- Idempotent migration. Does not alter customer_enquiries or existing assignment rows.

create table if not exists public.venue_partner_availability_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.venue_enquiry_assignments(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  event_date date not null,
  availability_status text not null
    check (availability_status in ('available','unavailable','needs_info')),
  quoted_price numeric(12,2)
    check (quoted_price is null or quoted_price >= 0),
  partner_note text
    check (partner_note is null or length(partner_note) <= 2000),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_partner_availability_assignment_unique unique (assignment_id)
);

create index if not exists venue_partner_availability_venue_date_idx
  on public.venue_partner_availability_responses (venue_id,event_date,confirmed_at desc);

create or replace function public.smv_guard_partner_availability_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.assignment_id is distinct from old.assignment_id
      or new.venue_id is distinct from old.venue_id
      or new.user_id is distinct from old.user_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Partner availability ownership fields cannot be changed'
        using errcode = '42501';
    end if;
  end if;

  if not exists (
    select 1
    from public.venue_enquiry_assignments a
    join public.customer_enquiries ce on ce.id = a.enquiry_id
    where a.id = new.assignment_id
      and a.venue_id = new.venue_id
      and ce.event_date = new.event_date
  ) then
    raise exception 'Availability response must match the assigned venue and the enquiry event date'
      using errcode = '23503';
  end if;

  new.updated_at := now();
  new.confirmed_at := now();
  return new;
end;
$$;

revoke all on function public.smv_guard_partner_availability_response() from public, anon, authenticated;

drop trigger if exists smv_guard_partner_availability_response
  on public.venue_partner_availability_responses;
create trigger smv_guard_partner_availability_response
  before insert or update on public.venue_partner_availability_responses
  for each row execute function public.smv_guard_partner_availability_response();

alter table public.venue_partner_availability_responses enable row level security;

drop policy if exists smv_partner_read_own_availability_responses
  on public.venue_partner_availability_responses;
create policy smv_partner_read_own_availability_responses
  on public.venue_partner_availability_responses
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.venue_partner_profiles p
      where p.user_id = (select auth.uid())
        and p.venue_id = venue_partner_availability_responses.venue_id
        and p.is_active = true
    )
  );

drop policy if exists smv_partner_insert_own_availability_response
  on public.venue_partner_availability_responses;
create policy smv_partner_insert_own_availability_response
  on public.venue_partner_availability_responses
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.venue_partner_profiles p
      where p.user_id = (select auth.uid())
        and p.venue_id = venue_partner_availability_responses.venue_id
        and p.is_active = true
    )
    and exists (
      select 1 from public.venue_enquiry_assignments a
      where a.id = venue_partner_availability_responses.assignment_id
        and a.venue_id = venue_partner_availability_responses.venue_id
    )
  );

drop policy if exists smv_partner_update_own_availability_response
  on public.venue_partner_availability_responses;
create policy smv_partner_update_own_availability_response
  on public.venue_partner_availability_responses
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.venue_partner_profiles p
      where p.user_id = (select auth.uid())
        and p.venue_id = venue_partner_availability_responses.venue_id
        and p.is_active = true
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.venue_partner_profiles p
      where p.user_id = (select auth.uid())
        and p.venue_id = venue_partner_availability_responses.venue_id
        and p.is_active = true
    )
    and exists (
      select 1 from public.venue_enquiry_assignments a
      where a.id = venue_partner_availability_responses.assignment_id
        and a.venue_id = venue_partner_availability_responses.venue_id
    )
  );

drop policy if exists smv_staff_manage_partner_availability_responses
  on public.venue_partner_availability_responses;
create policy smv_staff_manage_partner_availability_responses
  on public.venue_partner_availability_responses
  for all to authenticated
  using (public.smv_is_active_staff())
  with check (public.smv_is_active_staff());

revoke all on public.venue_partner_availability_responses from anon;
grant select, insert, update on public.venue_partner_availability_responses to authenticated;

-- Realtime is only a transport; table-level RLS above remains authoritative.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'venue_partner_availability_responses'
    ) then
    alter publication supabase_realtime
      add table public.venue_partner_availability_responses;
  end if;
end;
$$;
