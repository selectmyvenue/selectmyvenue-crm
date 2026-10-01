-- Stage 2: persist the selected venue plan duration so Venue Management
-- and Billing Center use the same plan-term model.
alter table public.venues
  add column if not exists plan_term_months integer;

alter table public.venues
  drop constraint if exists venues_plan_term_months_check;

alter table public.venues
  add constraint venues_plan_term_months_check
  check (plan_term_months is null or (plan_term_months >= 1 and plan_term_months <= 60));

update public.venues v
set plan_term_months = x.term_months
from (
  select distinct on (venue_id) venue_id, term_months
  from public.venue_billing_records
  where status = 'paid'
  order by venue_id, created_at desc
) x
where v.id = x.venue_id
  and (v.plan_term_months is null or v.plan_term_months <> x.term_months);

-- The live RPC definitions are updated separately during deployment so paid
-- billing records keep the venue's selected term in sync.

-- Keep billing activation and Venue Management duration in sync.
create or replace function public.smv_billing_create_record(
  p_venue_id uuid, p_plan_code text, p_term_months integer, p_amount numeric, p_status text,
  p_payment_method text default null, p_payment_reference text default null,
  p_start_date date default null, p_due_date date default null, p_notes text default null,
  p_standard_amount numeric default null, p_gst_applied boolean default false, p_gst_rate numeric default 18
) returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_venue public.venues%rowtype;
  v_plan public.venue_plans%rowtype;
  v_price public.venue_plan_prices%rowtype;
  v_record public.venue_billing_records%rowtype;
  v_start date;
  v_end date;
  v_received timestamptz;
  v_record_number text;
  v_receipt text;
  v_standard numeric(12,2);
  v_negotiated numeric(12,2);
  v_gst numeric(12,2);
  v_total numeric(12,2);
begin
  if not public.smv_is_active_staff() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_term_months < 1 or p_term_months > 60 then raise exception 'Invalid plan term'; end if;
  select * into v_venue from public.venues where id=p_venue_id;
  if not found then raise exception 'Venue not found'; end if;
  select * into v_plan from public.venue_plans where plan_code=p_plan_code and is_active=true;
  if not found then raise exception 'Select an active plan'; end if;
  select * into v_price from public.venue_plan_prices where plan_code=p_plan_code and term_months=p_term_months and is_active=true;
  if not found then raise exception 'No standard price is configured for this plan and term'; end if;
  if p_amount is null or p_amount < 0 then raise exception 'Negotiated amount cannot be negative'; end if;
  if p_status not in ('pending','paid') then raise exception 'Invalid billing status'; end if;
  if p_status='paid' and p_payment_method not in ('cash','cheque','upi','bank_transfer','other') then raise exception 'Select how payment was received'; end if;
  v_standard := round(coalesce(p_standard_amount,v_price.standard_amount),2);
  v_negotiated := round(p_amount,2);
  v_gst := case when coalesce(p_gst_applied,false) then round(v_negotiated * coalesce(p_gst_rate,18) / 100,2) else 0 end;
  v_total := round(v_negotiated + v_gst,2);
  v_start := coalesce(p_start_date,current_date);
  v_end := (v_start + ((p_term_months || ' months')::interval) - interval '1 day')::date;
  v_received := case when p_status='paid' then clock_timestamp() else null end;
  v_record_number := 'SMV-BILL-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text,1,8));
  v_receipt := case when p_status='paid' then 'SMV-RCPT-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text,1,8)) else null end;
  insert into public.venue_billing_records(
    record_number,receipt_number,venue_id,plan_code,plan_name,term_months,amount,standard_amount,negotiated_amount,
    gst_applied,gst_rate,gst_amount,total_amount,status,payment_method,payment_reference,owner_name,owner_mobile,owner_email,
    start_date,end_date,due_date,received_at,notes,created_by
  ) values(
    v_record_number,v_receipt,v_venue.id,v_plan.plan_code,v_plan.plan_name,p_term_months,v_negotiated,v_standard,v_negotiated,
    coalesce(p_gst_applied,false),coalesce(p_gst_rate,18),v_gst,v_total,p_status,
    case when p_status='paid' then p_payment_method else null end,
    nullif(btrim(coalesce(p_payment_reference,'')),''),v_venue.contact_person,v_venue.contact_mobile,v_venue.contact_email,
    v_start,v_end,case when p_status='pending' then coalesce(p_due_date,v_start) else null end,v_received,
    nullif(btrim(coalesce(p_notes,'')),''),auth.uid()
  ) returning * into v_record;
  if p_status='paid' then
    update public.venues
    set partner_plan=v_plan.plan_code,plan_term_months=p_term_months,plan_status='active',
        plan_started_at=v_start::timestamptz,plan_expires_at=v_end::timestamptz,updated_at=clock_timestamp()
    where id=v_venue.id;
  end if;
  return jsonb_build_object('record',to_jsonb(v_record),'venue',(select jsonb_build_object(
    'id',id,'venue_name',venue_name,'partner_plan',partner_plan,'plan_term_months',plan_term_months,
    'plan_status',plan_status,'plan_started_at',plan_started_at,'plan_expires_at',plan_expires_at)
    from public.venues where id=v_venue.id));
end;
$function$;

create or replace function public.smv_billing_mark_paid(
  p_record_id uuid, p_payment_method text, p_payment_reference text default null, p_start_date date default null
) returns jsonb
language plpgsql
set search_path to ''
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
  if v_record.status <> 'pending' then raise exception 'Only pending records can be marked paid'; end if;
  select * into v_venue from public.venues where id=v_record.venue_id;
  v_start := coalesce(p_start_date,v_record.start_date,current_date);
  v_end := (v_start + ((v_record.term_months || ' months')::interval) - interval '1 day')::date;
  v_receipt := 'SMV-RCPT-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text,1,8));
  update public.venue_billing_records
  set status='paid',payment_method=p_payment_method,payment_reference=nullif(btrim(coalesce(p_payment_reference,'')),''),
      receipt_number=v_receipt,start_date=v_start,end_date=v_end,due_date=null,received_at=clock_timestamp(),updated_at=clock_timestamp()
  where id=v_record.id returning * into v_record;
  update public.venues
  set partner_plan=v_record.plan_code,plan_term_months=v_record.term_months,plan_status='active',
      plan_started_at=v_start::timestamptz,plan_expires_at=v_end::timestamptz,updated_at=clock_timestamp()
  where id=v_venue.id;
  return jsonb_build_object('record',to_jsonb(v_record),'venue',(select jsonb_build_object(
    'id',id,'venue_name',venue_name,'partner_plan',partner_plan,'plan_term_months',plan_term_months,'plan_status',plan_status,
    'plan_started_at',plan_started_at,'plan_expires_at',plan_expires_at) from public.venues where id=v_venue.id));
end;
$function$;
