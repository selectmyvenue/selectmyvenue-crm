-- Reversible staff-only exclusion from future venue assignments.
-- Public venue records, website visibility, plans and existing assignments are untouched.
create table if not exists public.venue_assignment_exclusions (
  venue_id uuid primary key references public.venues(id) on delete restrict,
  reason text not null default 'not_interested',
  note text,
  hidden_at timestamptz not null default clock_timestamp(),
  hidden_by uuid not null default auth.uid(),
  restored_at timestamptz,
  restored_by uuid
);
create index if not exists venue_assignment_exclusions_hidden_idx
  on public.venue_assignment_exclusions (hidden_at desc)
  where restored_at is null;

create table if not exists public.venue_assignment_exclusion_log (
  id bigint generated always as identity primary key,
  venue_id uuid not null references public.venues(id) on delete restrict,
  action text not null check (action in ('hidden','restored')),
  reason text,
  note text,
  actor_id uuid not null default auth.uid(),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists venue_assignment_exclusion_log_venue_idx
  on public.venue_assignment_exclusion_log (venue_id, created_at desc);

alter table public.venue_assignment_exclusions enable row level security;
alter table public.venue_assignment_exclusion_log enable row level security;
drop policy if exists smv_admin_manage_assignment_exclusions on public.venue_assignment_exclusions;
create policy smv_admin_manage_assignment_exclusions
  on public.venue_assignment_exclusions for all to authenticated
  using ((select public.smv_is_active_staff()))
  with check ((select public.smv_is_active_staff()));
drop policy if exists smv_admin_read_assignment_exclusion_log on public.venue_assignment_exclusion_log;
create policy smv_admin_read_assignment_exclusion_log
  on public.venue_assignment_exclusion_log for select to authenticated
  using ((select public.smv_is_active_staff()));
drop policy if exists smv_admin_insert_assignment_exclusion_log on public.venue_assignment_exclusion_log;
create policy smv_admin_insert_assignment_exclusion_log
  on public.venue_assignment_exclusion_log for insert to authenticated
  with check ((select public.smv_is_active_staff()) and actor_id=(select auth.uid()));

revoke all on public.venue_assignment_exclusions, public.venue_assignment_exclusion_log from anon;
grant select, insert, update on public.venue_assignment_exclusions to authenticated;
grant select on public.venue_assignment_exclusion_log to authenticated;
grant usage, select on sequence public.venue_assignment_exclusion_log_id_seq to authenticated;

create or replace function public.smv_set_venue_assignment_exclusion(
  p_venue_id uuid, p_hidden boolean, p_reason text default 'not_interested', p_note text default null
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare v_name text;
begin
  if not public.smv_is_active_staff() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  select venue_name into v_name from public.venues where id=p_venue_id;
  if not found then raise exception 'Venue not found'; end if;

  if p_hidden then
    insert into public.venue_assignment_exclusions
      (venue_id, reason, note, hidden_at, hidden_by, restored_at, restored_by)
    values (p_venue_id, coalesce(nullif(btrim(p_reason),''),'not_interested'),
      nullif(btrim(coalesce(p_note,'')),''), clock_timestamp(), auth.uid(), null, null)
    on conflict (venue_id) do update set
      reason=excluded.reason, note=excluded.note,
      hidden_at=excluded.hidden_at, hidden_by=excluded.hidden_by,
      restored_at=null, restored_by=null;
    insert into public.venue_assignment_exclusion_log(venue_id,action,reason,note)
      values(p_venue_id,'hidden',coalesce(nullif(btrim(p_reason),''),'not_interested'),nullif(btrim(coalesce(p_note,'')),''));
  else
    update public.venue_assignment_exclusions
      set restored_at=clock_timestamp(), restored_by=auth.uid()
      where venue_id=p_venue_id and restored_at is null;
    if not found then raise exception 'Venue is not currently hidden'; end if;
    insert into public.venue_assignment_exclusion_log(venue_id,action,reason,note)
      values(p_venue_id,'restored',nullif(btrim(p_reason),''),nullif(btrim(coalesce(p_note,'')),''));
  end if;
  return jsonb_build_object('venue_id',p_venue_id,'venue_name',v_name,'hidden',p_hidden);
end;
$$;
revoke all on function public.smv_set_venue_assignment_exclusion(uuid,boolean,text,text) from public, anon, authenticated;
grant execute on function public.smv_set_venue_assignment_exclusion(uuid,boolean,text,text) to authenticated;

-- Database-level guard: even stale clients or alternate assignment entry points cannot
-- create/reactivate a future assignment for a hidden venue. Existing active rows remain.
create or replace function public.smv_guard_hidden_venue_assignment()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- Do not disrupt lifecycle updates on assignments that already existed when
  -- the venue was hidden. Block only new rows, venue swaps, and reactivation.
  if (tg_op = 'INSERT'
      or new.venue_id is distinct from old.venue_id
      or (old.assignment_status = 'cancelled' and new.assignment_status <> 'cancelled'))
     and new.assignment_status <> 'cancelled'
     and exists(select 1 from public.venue_assignment_exclusions e
       where e.venue_id=new.venue_id and e.restored_at is null) then
    raise exception 'This venue is hidden from new assignments. Restore it first.'
      using errcode='23514';
  end if;
  return new;
end;
$$;
drop trigger if exists smv_guard_hidden_venue_assignment on public.venue_enquiry_assignments;
create trigger smv_guard_hidden_venue_assignment
  before insert or update of venue_id, assignment_status on public.venue_enquiry_assignments
  for each row execute function public.smv_guard_hidden_venue_assignment();

-- Assignment UI needs exclusion IDs for staff matching/assignment; hidden venue details
-- remain restricted to active admins through the separate management RPC.
create or replace function public.smv_assignment_hidden_venue_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select e.venue_id from public.venue_assignment_exclusions e
  where e.restored_at is null and public.is_crm_staff()
$$;
revoke all on function public.smv_assignment_hidden_venue_ids() from public, anon;
grant execute on function public.smv_assignment_hidden_venue_ids() to authenticated;

create or replace function public.smv_get_venue_assignment_exclusions()
returns table(venue_id uuid, venue_name text, city text, area text, reason text, note text, hidden_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.smv_is_active_staff() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  return query
    select e.venue_id, v.venue_name::text, v.city::text, v.area::text,
           e.reason, e.note, e.hidden_at
    from public.venue_assignment_exclusions e
    join public.venues v on v.id=e.venue_id
    where e.restored_at is null
    order by e.hidden_at desc;
end;
$$;
revoke all on function public.smv_get_venue_assignment_exclusions() from public, anon;
grant execute on function public.smv_get_venue_assignment_exclusions() to authenticated;
