-- Select My Venue — Partner plan catalogue consistency
-- Keeps the Premium plan aligned with the approved feature list.
-- Safe to run more than once.

begin;

insert into public.venue_plans (
  plan_code,
  plan_name,
  description,
  display_order,
  features,
  is_active
)
values (
  'premium',
  'Premium',
  'Featured placement and the complete partner experience.',
  40,
  '["Featured listing","Premium placement","Advanced CRM","Advanced analytics","Enhanced promotion","Priority matching"]'::jsonb,
  true
)
on conflict (plan_code) do update
set
  features = excluded.features,
  updated_at = now();

commit;

-- Read-only verification:
-- select plan_code, plan_name, features
-- from public.venue_plans
-- where plan_code = 'premium';
