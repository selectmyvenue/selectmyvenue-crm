-- Employee CRM: preserves admin and venue-partner workflows.
begin;
create schema if not exists smv_private;
revoke all on schema smv_private from public, anon;
grant usage on schema smv_private to authenticated;

-- Legacy master-CRM checks now explicitly mean administrator.
create or replace function public.smv_is_active_staff() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.staff_profiles where user_id=auth.uid() and is_active and role='admin');
$$;
create or replace function public.is_crm_staff() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.staff_profiles where user_id=auth.uid() and is_active and role in ('admin','agent'));
$$;
revoke all on function public.smv_is_active_staff(), public.is_crm_staff() from public, anon;
grant execute on function public.smv_is_active_staff(), public.is_crm_staff() to authenticated;

alter table public.customer_enquiries add column if not exists call_outcome text not null default 'Not Connected';
alter table public.customer_enquiries add constraint smv_call_outcome_check check(call_outcome in ('Not Connected','Connected','Not Picked','Busy','Switched Off','Wrong Number','Call Back'));

-- Keep website insert policy and admin management policy. Employees only read directly.
create policy smv_employee_read_leads on public.customer_enquiries for select to authenticated
 using ((select public.is_crm_staff()));
-- Remove non-row privileges that are not constrained by RLS.
revoke truncate,references,trigger on public.customer_enquiries,public.staff_profiles,public.lead_followups,public.crm_activity_log,public.venues,public.venue_partner_profiles,public.venue_enquiry_assignments,public.venue_activity_log,public.venue_notifications,public.venue_plans from anon,authenticated;

-- Admins may inspect staff identities; only server-side account management writes profiles.
create policy smv_admin_read_staff on public.staff_profiles for select to authenticated using ((select public.smv_is_active_staff()));

-- Do not let arbitrary authenticated users read or forge CRM activity.
drop policy "Authenticated users can create CRM activity" on public.crm_activity_log;
drop policy "Authenticated users can read CRM activity" on public.crm_activity_log;
create policy smv_crm_read_activity on public.crm_activity_log for select to authenticated
 using ((select public.smv_is_active_staff()) or ((select public.is_crm_staff()) and created_by=(select auth.uid())));
create policy smv_admin_add_activity on public.crm_activity_log for insert to authenticated
 with check ((select public.smv_is_active_staff()) and created_by=(select auth.uid()));

create or replace function smv_private.save_employee_lead(p_id bigint,p_expected_updated_at timestamptz,p_patch jsonb,p_comment text,p_log_call boolean)
returns public.customer_enquiries language plpgsql security definer set search_path='' as $$
declare before_row public.customer_enquiries; after_row public.customer_enquiries; desired public.customer_enquiries; field text; old_values jsonb='{}'; new_values jsonb='{}'; actor uuid=auth.uid(); actor_name text;
begin
 if not public.is_crm_staff() then raise exception 'Active employee access required' using errcode='42501'; end if;
 if p_patch is null or jsonb_typeof(p_patch)<>'object' then raise exception 'Invalid lead changes'; end if;
 if exists(select 1 from jsonb_object_keys(p_patch) k where k <> all(array['customer_name','mobile','email','location','occasion','guests','budget_per_person','food_preference','event_date','requirements','status','priority','follow_up_at','site_visit_at','lost_reason','lost_reason_other','call_outcome'])) then
  raise exception 'A protected field cannot be changed' using errcode='42501';
 end if;
 if length(coalesce(p_comment,''))>4000 then raise exception 'Comment must be at most 4000 characters'; end if;
 select * into before_row from public.customer_enquiries where id=p_id for update;
 if not found then raise exception 'Lead not found'; end if;
 if before_row.updated_at is distinct from p_expected_updated_at then raise exception 'This lead changed. Close and reopen it before saving.' using errcode='40001'; end if;
 desired=jsonb_populate_record(before_row,p_patch);
 if length(btrim(desired.customer_name)) not between 2 and 120 or desired.customer_name is null then raise exception 'Enter a customer name (2–120 characters)'; end if;
 if desired.mobile is not null and length(regexp_replace(desired.mobile,'[^0-9]','','g')) not between 10 and 15 then raise exception 'Enter a valid phone number'; end if;
 if desired.guests<0 or desired.budget_per_person<0 then raise exception 'Guests and budget cannot be negative'; end if;
 if desired.location is null or desired.occasion is null then raise exception 'Location and event type cannot be null'; end if;
 if length(coalesce(desired.requirements,''))>10000 then raise exception 'Requirements are too long'; end if;
 update public.customer_enquiries set customer_name=desired.customer_name,mobile=desired.mobile,email=desired.email,
 location=desired.location,occasion=desired.occasion,guests=desired.guests,budget_per_person=desired.budget_per_person,
 food_preference=desired.food_preference,event_date=desired.event_date,requirements=desired.requirements,
 status=desired.status,priority=desired.priority,follow_up_at=desired.follow_up_at,site_visit_at=desired.site_visit_at,
 lost_reason=desired.lost_reason,lost_reason_other=desired.lost_reason_other,call_outcome=desired.call_outcome,
 contact_remark=case when nullif(btrim(p_comment),'') is not null then btrim(p_comment) else before_row.contact_remark end,
 last_contacted_at=case when p_log_call then clock_timestamp() else before_row.last_contacted_at end,
 contact_count=coalesce(before_row.contact_count,0)+case when p_log_call then 1 else 0 end,
 updated_at=clock_timestamp() where id=p_id returning * into after_row;
 for field in select jsonb_object_keys(to_jsonb(after_row)) loop
  if field<>'updated_at' and (to_jsonb(before_row)->field) is distinct from (to_jsonb(after_row)->field) then
   old_values=old_values||jsonb_build_object(field,to_jsonb(before_row)->field);
   new_values=new_values||jsonb_build_object(field,to_jsonb(after_row)->field);
  end if;
 end loop;
 select full_name into actor_name from public.staff_profiles where user_id=actor;
 insert into public.crm_activity_log(lead_id,activity_type,description,old_value,new_value,created_by)
 values(p_id,'employee_update',coalesce(actor_name,'Employee')||case when p_log_call then ' logged a call.' else ' updated lead.' end||case when nullif(btrim(p_comment),'') is not null then ' Comment: '||btrim(p_comment) else '' end,old_values::text,new_values::text,actor);
 return after_row;
end; $$;
revoke all on function smv_private.save_employee_lead(bigint,timestamptz,jsonb,text,boolean) from public,anon;
grant execute on function smv_private.save_employee_lead(bigint,timestamptz,jsonb,text,boolean) to authenticated;
create function public.smv_employee_save_lead(p_id bigint,p_expected_updated_at timestamptz,p_patch jsonb,p_comment text default '',p_log_call boolean default false)
returns public.customer_enquiries language sql security invoker set search_path='' as $$
 select * from smv_private.save_employee_lead(p_id,p_expected_updated_at,p_patch,p_comment,p_log_call);
$$;
revoke all on function public.smv_employee_save_lead(bigint,timestamptz,jsonb,text,boolean) from public,anon;
grant execute on function public.smv_employee_save_lead(bigint,timestamptz,jsonb,text,boolean) to authenticated;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='customer_enquiries') then
  alter publication supabase_realtime add table public.customer_enquiries;
 end if;
end $$;
commit;
