-- Run with psql -v ON_ERROR_STOP=1. Each partner context is isolated by JWT claims.
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;

insert into public.venue_partner_availability_responses
  (assignment_id,venue_id,user_id,event_date,availability_status)
values
  ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'aaaaaaaa-0000-4000-8000-000000000001',date '2026-12-10','available');

do $$
declare n integer;
begin
  select count(*) into n from public.venue_partner_availability_responses;
  if n <> 1 then raise exception 'Partner A should see exactly its own response, got %',n; end if;
  select count(*) into n from public.venue_match_feedback;
  if n <> 0 then raise exception 'Partner must not read staff-only match feedback'; end if;
  begin
    insert into public.venue_partner_availability_responses
      (assignment_id,venue_id,user_id,event_date,availability_status)
    values
      ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       'aaaaaaaa-0000-4000-8000-000000000001',date '2026-12-11','available');
    raise exception 'Cross-venue insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.venue_partner_availability_responses
      (assignment_id,venue_id,user_id,event_date,availability_status)
    values
      ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'aaaaaaaa-0000-4000-8000-000000000001',date '2026-12-11','available');
    raise exception 'Wrong event date unexpectedly succeeded';
  exception when foreign_key_violation then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','bbbbbbbb-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.venue_partner_availability_responses;
  if n <> 0 then raise exception 'Partner B must not see Partner A response, got %',n; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','cccccccc-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claim.role','staff',false);
set role authenticated;
insert into public.venue_match_feedback(enquiry_id,venue_id,action,match_score,data_confidence)
values (101,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','positive_fit',92,85);
do $$
declare n integer;
begin
  select count(*) into n from public.venue_match_feedback;
  if n <> 1 then raise exception 'Staff should be able to read the feedback row'; end if;
end $$;
reset role;
