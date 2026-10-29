-- Select My Venue HR Portal: additive schema only.
-- Does NOT alter customer_enquiries, staff_profiles, or existing RLS policies.
create table if not exists public.hr_people (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('candidate','employee','associate','contractor','intern')),
  full_name text not null, phone text, email text, city text, job_title text,
  job_type text not null default 'commission_only'
    check (job_type in ('full_time','part_time','contract','commission_only','fixed_plus_commission','hourly','internship','unpaid_volunteer')),
  employment_status text not null default 'applicant'
    check (employment_status in ('applicant','screening','interview','selected','offer_sent','onboarding','active','on_hold','exited','rejected')),
  fixed_pay numeric(12,2), pay_frequency text check (pay_frequency in ('monthly','weekly','hourly','per_task','not_applicable')),
  commission_type text check (commission_type in ('fixed_per_listing','percentage','tiered','custom','none')),
  commission_amount numeric(12,2), commission_notes text, start_date date, end_date date,
  source text, resume_url text, notes text, created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.hr_documents (
  id uuid primary key default gen_random_uuid(), person_id uuid not null references public.hr_people(id) on delete cascade,
  document_type text not null check (document_type in ('offer_letter','engagement_letter','appointment_letter','commission_policy','nda','joining_form','experience_letter','relieving_letter','warning_letter','other')),
  title text not null, document_date date not null default current_date, content text not null,
  status text not null default 'draft' check (status in ('draft','approved','issued','signed','cancelled')),
  created_by uuid not null default auth.uid(), created_at timestamptz not null default now()
);
create table if not exists public.hr_onboarding_tasks (
  id uuid primary key default gen_random_uuid(), person_id uuid not null references public.hr_people(id) on delete cascade,
  task_title text not null, due_date date, status text not null default 'pending' check (status in ('pending','in_progress','completed','waived')),
  notes text, completed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.hr_activity_log (
  id bigint generated always as identity primary key, person_id uuid references public.hr_people(id) on delete set null,
  action text not null, details jsonb not null default '{}'::jsonb, actor_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.hr_people enable row level security;
alter table public.hr_documents enable row level security;
alter table public.hr_onboarding_tasks enable row level security;
alter table public.hr_activity_log enable row level security;
create policy "hr_people_admin_all" on public.hr_people for all to authenticated
using (exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.role='admin' and s.is_active=true))
with check (exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.role='admin' and s.is_active=true));
create policy "hr_documents_admin_all" on public.hr_documents for all to authenticated
using (exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.role='admin' and s.is_active=true))
with check (exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.role='admin' and s.is_active=true));
create policy "hr_onboarding_admin_all" on public.hr_onboarding_tasks for all to authenticated
using (exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.role='admin' and s.is_active=true))
with check (exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.role='admin' and s.is_active=true));
create policy "hr_activity_admin_select" on public.hr_activity_log for select to authenticated
using (exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.role='admin' and s.is_active=true));
create policy "hr_activity_admin_insert" on public.hr_activity_log for insert to authenticated
with check (auth.uid()=actor_id and exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.role='admin' and s.is_active=true));
create index if not exists hr_people_status_idx on public.hr_people(employment_status);
create index if not exists hr_people_type_idx on public.hr_people(job_type);
create index if not exists hr_documents_person_idx on public.hr_documents(person_id);
create index if not exists hr_onboarding_person_idx on public.hr_onboarding_tasks(person_id);
