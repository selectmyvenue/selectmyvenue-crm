-- Harden the HR updated-at trigger against search_path manipulation.
alter function public.hr_set_updated_at() set search_path = pg_catalog;
