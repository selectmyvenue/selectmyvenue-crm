-- Disposable PostgreSQL fixtures approximating the Supabase auth/RLS surface.
create extension if not exists pgcrypto;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.customer_enquiries (
  id bigint primary key,
  event_date date not null
);
create table public.venues (id uuid primary key);
create table public.venue_enquiry_assignments (
  id uuid primary key default gen_random_uuid(),
  enquiry_id bigint not null references public.customer_enquiries(id),
  venue_id uuid not null references public.venues(id)
);
create table public.venue_partner_profiles (
  user_id uuid not null,
  venue_id uuid not null references public.venues(id),
  is_active boolean not null default true,
  primary key(user_id, venue_id)
);
create or replace function public.smv_is_active_staff() returns boolean
language sql stable
as $$ select current_setting('request.jwt.claim.role', true) = 'staff' $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function public.smv_is_active_staff() to authenticated;
grant select on public.customer_enquiries, public.venues, public.venue_enquiry_assignments, public.venue_partner_profiles to authenticated;
insert into public.customer_enquiries(id,event_date) values
  (101, date '2026-12-10'), (102, date '2026-12-11');
insert into public.venues(id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.venue_enquiry_assignments(id,enquiry_id,venue_id) values
  ('11111111-1111-4111-8111-111111111111',101,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22222222-2222-4222-8222-222222222222',102,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into auth.users(id) values
  ('aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002'),
  ('cccccccc-0000-4000-8000-000000000003');
insert into public.venue_partner_profiles(user_id,venue_id,is_active) values
  ('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true),
  ('bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
