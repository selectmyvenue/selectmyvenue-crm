-- 2026-09-24: cached road-route distances for nearest venue matching
create table if not exists public.route_distance_cache (
  cache_key text primary key,
  origin_lat numeric not null,
  origin_lon numeric not null,
  destination_lat numeric not null,
  destination_lon numeric not null,
  profile text not null default 'driving',
  distance_m integer,
  duration_s integer,
  provider text not null default 'osrm',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.route_distance_cache enable row level security;
comment on table public.route_distance_cache is 'Server-side cached road-route distances for CRM venue matching.';
