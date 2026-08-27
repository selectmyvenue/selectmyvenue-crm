-- Select My Venue — Venue Media & Public Profiles
-- Adds a staff-managed public cover image and expands the safe public venue RPC.
-- Safe to run more than once from the Supabase SQL Editor.

begin;

-- ---------------------------------------------------------------------------
-- 1. Public venue media metadata
-- ---------------------------------------------------------------------------

alter table public.venues
  add column if not exists cover_image_url text;

-- ---------------------------------------------------------------------------
-- 2. Public venue-media bucket with staff-only management
-- ---------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'venue-media',
  'venue-media',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists smv_public_view_venue_media
on storage.objects;

create policy smv_public_view_venue_media
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'venue-media');

drop policy if exists smv_staff_upload_venue_media
on storage.objects;

create policy smv_staff_upload_venue_media
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'venue-media'
  and public.smv_is_active_staff()
);

drop policy if exists smv_staff_update_venue_media
on storage.objects;

create policy smv_staff_update_venue_media
on storage.objects
for update
to authenticated
using (
  bucket_id = 'venue-media'
  and public.smv_is_active_staff()
)
with check (
  bucket_id = 'venue-media'
  and public.smv_is_active_staff()
);

drop policy if exists smv_staff_delete_venue_media
on storage.objects;

create policy smv_staff_delete_venue_media
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'venue-media'
  and public.smv_is_active_staff()
);

-- ---------------------------------------------------------------------------
-- 3. Safe public directory/profile data
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

-- Read-only verification queries:
-- select id, public, file_size_limit from storage.buckets where id = 'venue-media';
-- select cover_image_url from public.venues limit 1;
-- select * from public.smv_public_venues();
