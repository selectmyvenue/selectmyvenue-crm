-- Select My Venue — Venue Gallery + Video Uploads
-- Enables up to 8 gallery photos and 2 venue videos in the existing public venue-media bucket.
-- Safe to run more than once in the Supabase SQL Editor.

begin;

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
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Existing media policies are intentionally preserved. The current setup already
-- allows public reading and active staff upload/update/delete for this bucket.

commit;

-- Verification:
-- select id, public, file_size_limit, allowed_mime_types
-- from storage.buckets
-- where id = 'venue-media';
