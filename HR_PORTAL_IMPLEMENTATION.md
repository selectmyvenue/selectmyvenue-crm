# Master HR Portal — implementation checklist

## Placement
- Add a dedicated HR Portal link in Master CRM navigation.
- Open HR in a new browser tab, matching the existing Billing Center behaviour.
- Reuse existing Supabase Auth session; restrict HR pages and data to active CRM admins.
- Do not deploy or apply migrations to production until explicitly approved.

## Modules
1. Dashboard: candidates, active team, open offers, onboarding due, commission-only roles.
2. People master: candidates, employees, associates, contractors and interns; contact details, city, role, source, notes, resume link, status and lifecycle history.
3. Flexible work types: full-time, part-time, contract, commission-only/no fixed salary, fixed + commission, hourly, internship and unpaid volunteer.
4. Compensation: fixed pay/frequency, commission model (fixed per successful paid venue listing, percentage, tiered or custom), exact eligibility/payout/renewal/cancellation notes.
5. Hiring pipeline: applicant → screening → interview → selected → offer → onboarding → active / rejected / on hold / exited.
6. Document centre: offer, engagement, appointment, commission policy, NDA/confidentiality, joining forms, experience and relieving letters; editable drafts, approval status and print/PDF.
7. Onboarding / exit checklists: due dates, task status, acknowledgements, access checklist and handover.
8. Reports: hiring source, conversion, active headcount, role types and commission payout eligibility.
9. Security: admin-only RLS, no public HR data, audit trail, no service-role key in browser, explicit backup/export approach.

## Current hiring campaign — Venue Listing Executive
- Source: Meta hiring ad / WhatsApp.
- Location: Delhi / Gurugram.
- Default job type: commission-only (no fixed salary), but only if the candidate has been clearly informed and the arrangement is lawful.
- Commission amount, exact qualifying event, payment timing, renewals, refunds/cancellations and approval must be agreed in writing before an offer is issued. Do not invent a commission rate.
- Candidate pipeline: applicant → resume received → screening → interview → selected / rejected → engagement letter → onboarding.

## Database safety
- Proposed additive tables: hr_people, hr_documents, hr_onboarding_tasks, hr_activity_log.
- Existing customer_enquiries and its policies are not changed. Existing staff_profiles is read only for admin authorization.
- Migration is staged in this branch only and is not applied to Supabase.
- No software can honestly guarantee zero errors; test auth, RLS, CRUD, document generation, responsive UI and current CRM regression tests before merge/deployment.
