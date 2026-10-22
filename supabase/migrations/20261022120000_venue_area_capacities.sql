-- SMV Venue Management: structured capacities for lawn/open/outdoor areas.
-- Safe additive migration: existing venue fields and customer enquiry tables are untouched.
begin;
alter table public.venues
  add column if not exists area_features jsonb not null default '{}'::jsonb;
comment on column public.venues.area_features is
  'Venue area availability and confirmed guest capacities, e.g. {"lawn":{"available":true,"capacity":200},"open_area":{"available":false,"capacity":null},"outdoor_space":{"available":true,"capacity":150}}';
commit;
