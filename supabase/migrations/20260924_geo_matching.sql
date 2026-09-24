-- 2026-09-24: geocoded customer preference support for nearest-venue matching
alter table public.customer_enquiries
  add column if not exists preferred_latitude numeric,
  add column if not exists preferred_longitude numeric,
  add column if not exists preferred_geocoded_at timestamptz;

create table if not exists public.geocode_cache (
  cache_key text primary key,
  query_text text not null,
  latitude numeric not null,
  longitude numeric not null,
  display_name text,
  provider text not null default 'nominatim',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.geocode_cache enable row level security;
comment on table public.geocode_cache is 'Server-side geocoding cache used by authenticated CRM matching automation.';
