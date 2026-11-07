-- SMV AI Matching V2: auditable recommendation feedback and outcome signals.
-- New isolated table only; existing CRM enquiry/assignment schemas remain unchanged.

create table if not exists public.venue_match_feedback (
  id uuid primary key default gen_random_uuid(),
  enquiry_id bigint not null references public.customer_enquiries(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  action text not null check (action in ('positive_fit','negative_fit')),
  match_score smallint check (match_score between 0 and 100),
  data_confidence smallint check (data_confidence between 0 and 100),
  rank_position smallint check (rank_position is null or rank_position > 0),
  reason text check (reason is null or length(reason) <= 500),
  requirement_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists venue_match_feedback_venue_created_idx
  on public.venue_match_feedback (venue_id, created_at desc);
create index if not exists venue_match_feedback_enquiry_idx
  on public.venue_match_feedback (enquiry_id, created_at desc);

alter table public.venue_match_feedback enable row level security;

drop policy if exists smv_staff_manage_venue_match_feedback
  on public.venue_match_feedback;
create policy smv_staff_manage_venue_match_feedback
  on public.venue_match_feedback
  for all to authenticated
  using (public.smv_is_active_staff())
  with check (public.smv_is_active_staff());

revoke all on public.venue_match_feedback from anon;
grant select, insert on public.venue_match_feedback to authenticated;

comment on table public.venue_match_feedback is
  'Staff-only, auditable feedback on venue recommendations. Used for explainable ranking calibration; not a customer-facing data source.';
