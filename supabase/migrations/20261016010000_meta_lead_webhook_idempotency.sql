-- Meta webhook idempotency is kept separate from customer_enquiries.
-- This migration is proposed only; do not apply it to production until the webhook
-- is reviewed and a non-production end-to-end test is complete.
begin;

create table if not exists public.meta_lead_webhook_events (
  meta_lead_id text primary key,
  enquiry_id bigint references public.customer_enquiries(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.meta_lead_webhook_events enable row level security;
revoke all on table public.meta_lead_webhook_events from public, anon, authenticated;
grant all on table public.meta_lead_webhook_events to service_role;

comment on table public.meta_lead_webhook_events is
  'Private idempotency ledger for Meta leadgen webhooks; contains no customer contact details.';

create or replace function public.insert_meta_lead_enquiry(
  p_meta_lead_id text,
  p_enquiry jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enquiry_id bigint;
begin
  if p_meta_lead_id is null or length(btrim(p_meta_lead_id)) = 0 then
    raise exception 'Meta lead ID is required' using errcode = '22023';
  end if;
  if p_enquiry is null or jsonb_typeof(p_enquiry) <> 'object' then
    raise exception 'Enquiry payload must be a JSON object' using errcode = '22023';
  end if;
  if nullif(btrim(p_enquiry->>'customer_name'), '') is null
     or nullif(btrim(p_enquiry->>'mobile'), '') is null then
    raise exception 'Customer name and mobile are required' using errcode = '22023';
  end if;

  insert into public.meta_lead_webhook_events(meta_lead_id)
  values (btrim(p_meta_lead_id))
  on conflict (meta_lead_id) do nothing;

  if not found then
    select e.enquiry_id into v_enquiry_id
    from public.meta_lead_webhook_events e
    where e.meta_lead_id = btrim(p_meta_lead_id);
    return jsonb_build_object('inserted', false, 'enquiry_id', v_enquiry_id);
  end if;

  insert into public.customer_enquiries (
    customer_name, mobile, email, location, occasion, guests,
    requirements, source, status
  ) values (
    btrim(p_enquiry->>'customer_name'),
    btrim(p_enquiry->>'mobile'),
    nullif(p_enquiry->>'email', ''),
    nullif(p_enquiry->>'location', ''),
    nullif(p_enquiry->>'occasion', ''),
    case
      when coalesce(p_enquiry->>'guests', '') ~ '^[0-9]+$'
      then (p_enquiry->>'guests')::integer
      else null
    end,
    nullif(p_enquiry->>'requirements', ''),
    'Meta Ads - Instant Form',
    'new'
  ) returning id into v_enquiry_id;

  update public.meta_lead_webhook_events
  set enquiry_id = v_enquiry_id, processed_at = now()
  where meta_lead_id = btrim(p_meta_lead_id);

  return jsonb_build_object('inserted', true, 'enquiry_id', v_enquiry_id);
end;
$$;

revoke all on function public.insert_meta_lead_enquiry(text, jsonb) from public, anon, authenticated;
grant execute on function public.insert_meta_lead_enquiry(text, jsonb) to service_role;

commit;
