-- 2026-09-24: RLS init-plan performance cleanup.
-- Logic and access remain unchanged; auth.uid() is evaluated once per statement.

drop policy if exists "Staff can view their own profile" on public.staff_profiles;
create policy "Staff can view their own profile"
on public.staff_profiles for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "CRM staff can create followups" on public.lead_followups;
create policy "CRM staff can create followups"
on public.lead_followups for insert to authenticated
with check (public.is_crm_staff() and staff_user_id = (select auth.uid()));

drop policy if exists "CRM staff can update followups" on public.lead_followups;
create policy "CRM staff can update followups"
on public.lead_followups for update to authenticated
using (public.is_crm_staff() and staff_user_id = (select auth.uid()))
with check (public.is_crm_staff() and staff_user_id = (select auth.uid()));

drop policy if exists smv_partner_view_own_profile on public.venue_partner_profiles;
create policy smv_partner_view_own_profile
on public.venue_partner_profiles for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists smv_partner_view_assigned_enquiries on public.venue_enquiry_assignments;
create policy smv_partner_view_assigned_enquiries
on public.venue_enquiry_assignments for select to authenticated
using (exists (
  select 1 from public.venue_partner_profiles vpp
  where vpp.venue_id = venue_enquiry_assignments.venue_id
    and vpp.user_id = (select auth.uid())
    and vpp.is_active = true
));

drop policy if exists smv_partner_update_assigned_enquiries on public.venue_enquiry_assignments;
create policy smv_partner_update_assigned_enquiries
on public.venue_enquiry_assignments for update to authenticated
using (exists (
  select 1 from public.venue_partner_profiles vpp
  where vpp.venue_id = venue_enquiry_assignments.venue_id
    and vpp.user_id = (select auth.uid())
    and vpp.is_active = true
))
with check (exists (
  select 1 from public.venue_partner_profiles vpp
  where vpp.venue_id = venue_enquiry_assignments.venue_id
    and vpp.user_id = (select auth.uid())
    and vpp.is_active = true
));

drop policy if exists smv_partner_view_own_activity on public.venue_activity_log;
create policy smv_partner_view_own_activity
on public.venue_activity_log for select to authenticated
using (exists (
  select 1 from public.venue_partner_profiles vpp
  where vpp.venue_id = venue_activity_log.venue_id
    and vpp.user_id = (select auth.uid())
    and vpp.is_active = true
));

drop policy if exists smv_partner_view_own_venue on public.venues;
create policy smv_partner_view_own_venue
on public.venues for select to authenticated
using (exists (
  select 1 from public.venue_partner_profiles vpp
  where vpp.venue_id = venues.id
    and vpp.user_id = (select auth.uid())
    and vpp.is_active = true
));
