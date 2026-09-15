-- Select My Venue — Venue room count
-- Adds a numeric room count while preserving the existing rooms_available boolean.
-- Safe to run more than once in the Supabase SQL Editor.

begin;

alter table public.venues
  add column if not exists room_count integer;

do $constraint$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'venues_room_count_nonnegative'
      and conrelid = 'public.venues'::regclass
  ) then
    alter table public.venues
      add constraint venues_room_count_nonnegative
      check (room_count is null or room_count >= 0);
  end if;
end
$constraint$;

-- Keep the existing availability flag consistent whenever a positive count exists.
update public.venues
set rooms_available = true
where coalesce(room_count, 0) > 0
  and rooms_available is distinct from true;

-- Safe public directory/profile payload. Existing fields are preserved and
-- room_count is exposed only as a non-sensitive venue facility attribute.
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
    'room_count', v.room_count,
    'catering_available', v.catering_available,
    'decoration_available', v.decoration_available,
    'google_maps_url', v.google_maps_url,
    'cover_image_url', v.cover_image_url,
    'featured', v.featured
  ) as venue
  from public.venues v
  where v.venue_status = 'approved'
    and v.verification_status = 'verified'
    and v.public_listing_enabled = true
  order by v.featured desc, v.venue_name asc;
$function$;

revoke all on function public.smv_public_venues() from public;
grant execute on function public.smv_public_venues() to anon, authenticated;

commit;

-- Verification:
-- select venue_name, rooms_available, room_count from public.venues order by venue_name;
-- select * from public.smv_public_venues();
