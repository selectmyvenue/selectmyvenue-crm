-- Select My Venue: isolated venue billing center
-- Manual billing ledger only. No payment gateway or transaction processing.
-- Applied to production as create_venue_billing_center_20260926.

create table if not exists public.venue_billing_records (
  id uuid primary key default gen_random_uuid(),
  record_number text not null unique,
  receipt_number text unique,
  venue_id uuid not null references public.venues(id) on delete restrict,
  plan_code text not null references public.venue_plans(plan_code) on update cascade,
  plan_name text not null,
  term_months integer not null check (term_months between 1 and 60),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  payment_method text check (payment_method is null or payment_method in ('cash','cheque','upi','bank_transfer','other')),
  payment_reference text,
  owner_name text,
  owner_mobile text,
  owner_email text,
  start_date date,
  end_date date,
  due_date date,
  received_at timestamptz,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_venue_billing_records_venue_created
on public.venue_billing_records(venue_id, created_at desc);
create index if not exists idx_venue_billing_records_status
on public.venue_billing_records(status);
create index if not exists idx_venue_billing_records_plan_code
on public.venue_billing_records(plan_code);

alter table public.venue_billing_records enable row level security;

drop policy if exists venue_billing_select on public.venue_billing_records;
create policy venue_billing_select
on public.venue_billing_records for select to authenticated
using ((select public.smv_is_active_staff()));

drop policy if exists venue_billing_insert on public.venue_billing_records;
create policy venue_billing_insert
on public.venue_billing_records for insert to authenticated
with check ((select public.smv_is_active_staff()) and created_by = (select auth.uid()));

drop policy if exists venue_billing_update_pending on public.venue_billing_records;
create policy venue_billing_update_pending
on public.venue_billing_records for update to authenticated
using ((select public.smv_is_active_staff()) and status = 'pending')
with check ((select public.smv_is_active_staff()));

revoke all on table public.venue_billing_records from anon;
grant select, insert, update on table public.venue_billing_records to authenticated;

create or replace function public.smv_billing_create_record(
  p_venue_id uuid,
  p_plan_code text,
  p_term_months integer,
  p_amount numeric,
  p_status text,
  p_payment_method text default null,
  p_payment_reference text default null,
  p_start_date date default null,
  p_due_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_venue public.venues%rowtype;
  v_plan public.venue_plans%rowtype;
  v_record public.venue_billing_records%rowtype;
  v_start date;
  v_end date;
  v_received timestamptz;
  v_record_number text;
  v_receipt text;
begin
  if not public.smv_is_active_staff() then raise exception 'Administrator access required' using errcode='42501'; end if;
  select * into v_venue from public.venues where id=p_venue_id;
  if not found then raise exception 'Venue not found'; end if;
  select * into v_plan from public.venue_plans where plan_code=p_plan_code and is_active=true;
  if not found then raise exception 'Select an active plan'; end if;
  if p_term_months is null or p_term_months<1 or p_term_months>60 then raise exception 'Plan term must be between 1 and 60 months'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
  if p_status not in ('pending','paid') then raise exception 'Invalid billing status'; end if;
  if p_status='paid' and p_payment_method not in ('cash','cheque','upi','bank_transfer','other') then raise exception 'Select how payment was received'; end if;

  v_start:=coalesce(p_start_date,current_date);
  v_end:=(v_start+((p_term_months||' months')::interval)-interval '1 day')::date;
  v_received:=case when p_status='paid' then clock_timestamp() else null end;
  v_record_number:='SMV-BILL-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(gen_random_uuid()::text,1,8));
  v_receipt:=case when p_status='paid' then 'SMV-RCPT-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(gen_random_uuid()::text,1,8)) else null end;

  insert into public.venue_billing_records (
    record_number,receipt_number,venue_id,plan_code,plan_name,term_months,amount,status,
    payment_method,payment_reference,owner_name,owner_mobile,owner_email,
    start_date,end_date,due_date,received_at,notes,created_by
  ) values (
    v_record_number,v_receipt,v_venue.id,v_plan.plan_code,v_plan.plan_name,p_term_months,round(p_amount,2),p_status,
    case when p_status='paid' then p_payment_method else null end,
    nullif(btrim(coalesce(p_payment_reference,'')), ''),
    v_venue.contact_person,v_venue.contact_mobile,v_venue.contact_email,
    v_start,v_end,case when p_status='pending' then coalesce(p_due_date,v_start) else null end,
    v_received,nullif(btrim(coalesce(p_notes,'')), ''),auth.uid()
  ) returning * into v_record;

  if p_status='paid' then
    update public.venues
    set partner_plan=v_plan.plan_code,plan_status='active',
        plan_started_at=v_start::timestamptz,plan_expires_at=v_end::timestamptz,
        updated_at=clock_timestamp()
    where id=v_venue.id;
  end if;

  return jsonb_build_object('record',to_jsonb(v_record),'venue',(
    select jsonb_build_object('id',id,'venue_name',venue_name,'partner_plan',partner_plan,'plan_status',plan_status,'plan_started_at',plan_started_at,'plan_expires_at',plan_expires_at)
    from public.venues where id=v_venue.id
  ));
end;
$function$;

create or replace function public.smv_billing_mark_paid(
  p_record_id uuid,p_payment_method text,p_payment_reference text default null,p_start_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_record public.venue_billing_records%rowtype;
  v_venue public.venues%rowtype;
  v_start date;
  v_end date;
  v_receipt text;
begin
  if not public.smv_is_active_staff() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_payment_method not in ('cash','cheque','upi','bank_transfer','other') then raise exception 'Select how payment was received'; end if;
  select * into v_record from public.venue_billing_records where id=p_record_id for update;
  if not found then raise exception 'Billing record not found'; end if;
  if v_record.status<>'pending' then raise exception 'Only pending records can be marked paid'; end if;
  select * into v_venue from public.venues where id=v_record.venue_id;
  v_start:=coalesce(p_start_date,v_record.start_date,current_date);
  v_end:=(v_start+((v_record.term_months||' months')::interval)-interval '1 day')::date;
  v_receipt:='SMV-RCPT-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(gen_random_uuid()::text,1,8));

  update public.venue_billing_records
  set status='paid',payment_method=p_payment_method,
      payment_reference=nullif(btrim(coalesce(p_payment_reference,'')), ''),
      receipt_number=v_receipt,start_date=v_start,end_date=v_end,due_date=null,
      received_at=clock_timestamp(),updated_at=clock_timestamp()
  where id=v_record.id returning * into v_record;

  update public.venues
  set partner_plan=v_record.plan_code,plan_status='active',
      plan_started_at=v_start::timestamptz,plan_expires_at=v_end::timestamptz,
      updated_at=clock_timestamp()
  where id=v_venue.id;

  return jsonb_build_object('record',to_jsonb(v_record),'venue',(
    select jsonb_build_object('id',id,'venue_name',venue_name,'partner_plan',partner_plan,'plan_status',plan_status,'plan_started_at',plan_started_at,'plan_expires_at',plan_expires_at)
    from public.venues where id=v_venue.id
  ));
end;
$function$;

revoke all on function public.smv_billing_create_record(uuid,text,integer,numeric,text,text,text,date,date,text) from public,anon,authenticated;
grant execute on function public.smv_billing_create_record(uuid,text,integer,numeric,text,text,text,date,date,text) to authenticated;

revoke all on function public.smv_billing_mark_paid(uuid,text,text,date) from public,anon,authenticated;
grant execute on function public.smv_billing_mark_paid(uuid,text,text,date) to authenticated;
