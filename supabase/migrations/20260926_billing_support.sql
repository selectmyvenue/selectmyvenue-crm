-- Select My Venue: manual billing/payment support
-- Current production state: GST/tax is intentionally disabled until business/GST setup is complete.
-- No card, UPI PIN, bank password, or gateway credentials are stored here.

create sequence if not exists public.smv_billing_receipt_seq start with 1;

create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  venue_id uuid not null references public.venues(id) on delete restrict,
  owner_name text,
  owner_email text,
  owner_mobile text,
  venue_name text not null,
  plan_code text,
  plan_name text not null,
  term_months integer check (term_months is null or (term_months between 1 and 60)),
  amount numeric(12,2) not null check (amount >= 0),
  tax_mode text not null default 'none' check (tax_mode in ('none','gst')),
  tax_rate numeric(5,2) check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 100)),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  payment_method text check (payment_method is null or payment_method in ('cash','cheque','upi','bank_transfer','other')),
  payment_reference text,
  received_at timestamptz,
  start_date date,
  end_date date,
  reminder_sent_at timestamptz,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_transactions enable row level security;

create index if not exists idx_billing_transactions_venue_id on public.billing_transactions(venue_id);
create index if not exists idx_billing_transactions_status on public.billing_transactions(status);
create index if not exists idx_billing_transactions_created_at on public.billing_transactions(created_at desc);

drop policy if exists smv_billing_admin_read on public.billing_transactions;
create policy smv_billing_admin_read
on public.billing_transactions for select to authenticated
using ((select public.smv_is_active_staff()));

drop policy if exists smv_billing_admin_insert on public.billing_transactions;
create policy smv_billing_admin_insert
on public.billing_transactions for insert to authenticated
with check ((select public.smv_is_active_staff()) and created_by = (select auth.uid()));

drop policy if exists smv_billing_admin_update on public.billing_transactions;
create policy smv_billing_admin_update
on public.billing_transactions for update to authenticated
using ((select public.smv_is_active_staff()))
with check ((select public.smv_is_active_staff()));

revoke all on table public.billing_transactions from anon, authenticated;
grant select on table public.billing_transactions to authenticated;
revoke all on sequence public.smv_billing_receipt_seq from public, anon, authenticated;

create or replace function public.smv_billing_record_payment(
  p_venue_id uuid,
  p_plan_code text default null,
  p_plan_name text default null,
  p_amount numeric default 0,
  p_term_months integer default 1,
  p_status text default 'paid',
  p_payment_method text default null,
  p_payment_reference text default null,
  p_received_at timestamptz default null,
  p_start_date date default null,
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
  v_tx public.billing_transactions%rowtype;
  v_plan_name text;
  v_plan_code text;
  v_start_date date;
  v_end_date date;
  v_total numeric(12,2);
  v_received_at timestamptz;
begin
  if not public.smv_is_active_staff() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select * into v_venue from public.venues where id = p_venue_id;
  if not found then raise exception 'Venue not found'; end if;

  if p_amount is null or p_amount < 0 then raise exception 'Amount cannot be negative'; end if;
  if p_term_months is null or p_term_months < 1 or p_term_months > 60 then raise exception 'Plan term must be between 1 and 60 months'; end if;
  if p_status not in ('pending','paid','cancelled') then raise exception 'Invalid payment status'; end if;
  if p_status = 'paid' and p_payment_method not in ('cash','cheque','upi','bank_transfer','other') then raise exception 'Select how the payment was received'; end if;

  if p_plan_code is not null then
    select * into v_plan from public.venue_plans where plan_code = p_plan_code and is_active = true;
    if found then v_plan_code := v_plan.plan_code; v_plan_name := v_plan.plan_name; end if;
  end if;

  if v_plan_name is null then v_plan_name := nullif(btrim(coalesce(p_plan_name,'')), ''); end if;
  if v_plan_name is null then raise exception 'Plan name is required'; end if;

  v_start_date := coalesce(p_start_date, current_date);
  v_end_date := (v_start_date + ((p_term_months || ' months')::interval) - interval '1 day')::date;
  v_total := round(coalesce(p_amount,0), 2);
  v_received_at := case when p_status='paid' then coalesce(p_received_at, clock_timestamp()) else null end;

  insert into public.billing_transactions (
    receipt_number, venue_id, owner_name, owner_email, owner_mobile, venue_name,
    plan_code, plan_name, term_months, amount, tax_mode, tax_rate, tax_amount,
    total_amount, status, payment_method, payment_reference, received_at,
    start_date, end_date, notes, created_by
  )
  values (
    'SMV-PAY-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text,1,8)),
    v_venue.id,
    coalesce((select p.full_name from public.venue_partner_profiles p where p.venue_id=v_venue.id and p.is_primary=true and p.is_active=true order by p.created_at desc limit 1),v_venue.contact_person),
    coalesce((select p.email from public.venue_partner_profiles p where p.venue_id=v_venue.id and p.is_primary=true and p.is_active=true order by p.created_at desc limit 1),v_venue.contact_email),
    coalesce((select nullif(p.whatsapp_number,'') from public.venue_partner_profiles p where p.venue_id=v_venue.id and p.is_primary=true and p.is_active=true order by p.created_at desc limit 1),v_venue.contact_mobile),
    v_venue.venue_name, v_plan_code, v_plan_name, p_term_months, round(p_amount,2),
    'none', null, 0, v_total, p_status, p_payment_method,
    nullif(btrim(coalesce(p_payment_reference,'')), ''), v_received_at,
    v_start_date, v_end_date, nullif(btrim(coalesce(p_notes,'')), ''), auth.uid()
  )
  returning * into v_tx;

  if p_status='paid' then
    update public.venues
    set partner_plan=coalesce(v_plan_code,'custom'), plan_status='active',
        plan_started_at=v_start_date::timestamptz, plan_expires_at=v_end_date::timestamptz,
        updated_at=clock_timestamp()
    where id=v_venue.id;
  end if;

  return jsonb_build_object(
    'transaction',to_jsonb(v_tx),
    'venue',(select jsonb_build_object(
      'id',id,'venue_name',venue_name,'partner_plan',partner_plan,'plan_status',plan_status,
      'plan_started_at',plan_started_at,'plan_expires_at',plan_expires_at
    ) from public.venues where id=v_venue.id)
  );
end;
$function$;

create or replace function public.smv_billing_mark_paid(
  p_transaction_id uuid,
  p_payment_method text,
  p_payment_reference text default null,
  p_received_at timestamptz default null,
  p_start_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_tx public.billing_transactions%rowtype;
  v_venue public.venues%rowtype;
  v_start_date date;
  v_end_date date;
  v_received_at timestamptz;
begin
  if not public.smv_is_active_staff() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_payment_method not in ('cash','cheque','upi','bank_transfer','other') then raise exception 'Select how the payment was received'; end if;

  select * into v_tx from public.billing_transactions where id=p_transaction_id for update;
  if not found then raise exception 'Payment record not found'; end if;
  if v_tx.status<>'pending' then raise exception 'Only pending payments can be marked as paid'; end if;

  select * into v_venue from public.venues where id=v_tx.venue_id;

  v_start_date:=coalesce(p_start_date,current_date);
  v_end_date:=(v_start_date + ((coalesce(v_tx.term_months,1) || ' months')::interval) - interval '1 day')::date;
  v_received_at:=coalesce(p_received_at,clock_timestamp());

  update public.billing_transactions
  set status='paid', payment_method=p_payment_method,
      payment_reference=nullif(btrim(coalesce(p_payment_reference,'')),''),
      received_at=v_received_at, start_date=v_start_date, end_date=v_end_date,
      updated_at=clock_timestamp()
  where id=v_tx.id
  returning * into v_tx;

  update public.venues
  set partner_plan=coalesce(v_tx.plan_code,'custom'), plan_status='active',
      plan_started_at=v_start_date::timestamptz, plan_expires_at=v_end_date::timestamptz,
      updated_at=clock_timestamp()
  where id=v_venue.id;

  return jsonb_build_object('transaction',to_jsonb(v_tx),'venue',(
    select jsonb_build_object('id',id,'venue_name',venue_name,'partner_plan',partner_plan,
      'plan_status',plan_status,'plan_started_at',plan_started_at,'plan_expires_at',plan_expires_at)
    from public.venues where id=v_venue.id
  ));
end;
$function$;

revoke all on function public.smv_billing_record_payment(uuid,text,text,numeric,integer,text,text,text,timestamptz,date,text) from public,anon,authenticated;
grant execute on function public.smv_billing_record_payment(uuid,text,text,numeric,integer,text,text,text,timestamptz,date,text) to authenticated;

revoke all on function public.smv_billing_mark_paid(uuid,text,text,timestamptz,date) from public,anon,authenticated;
grant execute on function public.smv_billing_mark_paid(uuid,text,text,timestamptz,date) to authenticated;
