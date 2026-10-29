# SMV HR & Hiring Portal — Product Blueprint (Benchmark-informed)

## Benchmark reviewed
- BambooHR: unified people data, recruiting, onboarding, compensation, documents, performance, analytics, lifecycle history and connected workflows.
- Zoho People: core HR, employee self-service, attendance, shifts, leave, timesheets, help desk, documents, offboarding, performance, compensation, payroll/expenses, HR analytics and workflow automation.
- Darwinbox: configurable requisitions, candidate pipeline, interview feedback, offer approvals, mobile workflows, hiring analytics and post-hire analytics.
- Greenhouse: candidate-facing application status, clear hiring stages, job alerts, quick apply and candidate tasks.
References: https://www.bamboohr.com/platform/ ; https://www.zoho.com/people/features.html ; https://explore.darwinbox.com/lp/recruitment ; https://support.greenhouse.io/hc/en-us/articles/28688386131739-MyGreenhouse-candidate-portal

## Product goal
Build a polished, corporate, responsive HR and hiring workspace for Select My Venue inside its existing Master CRM. HR opens in a separate browser tab from the CRM navigation, reuses the existing authenticated session, and keeps HR data isolated and admin-only. Free-first: do not enable paid products or create paid infrastructure.

## Premium navigation architecture
1. Overview
2. Recruitment
   - Job requisitions / openings
   - Candidate pipeline (Kanban + table)
   - Candidate profiles, CV links, source tracking and duplicate checks
   - Interview calendar, structured scorecards and feedback
   - Shortlist / reject / hold decisions and communication log
   - Offer approval and offer status
3. People
   - Employee / associate / contractor / intern master
   - Role, department, reporting manager, location, work arrangement, status and lifecycle timeline
   - Employee self-service (phase 2, separate least-privilege role)
4. Compensation & Commission
   - Full-time, part-time, fixed pay, hourly, contract, commission-only, fixed + commission, internship and volunteer record types
   - Effective-dated terms and approval history
   - Commission plan: qualifying event, rate, payout trigger, renewals, cancellation/refund treatment, proof and approval
   - Commission-only Venue Listing Executive template; no rate assumed
   - Payout ledger / export (no automatic money transfer)
5. Letters & Documents
   - Offer, appointment, engagement, commission policy, confidentiality, joining, policy acknowledgement, experience, relieving and warning letter templates
   - Versioned drafts, approvals, issue/signature status and print/PDF
   - Sensitive files stored privately; avoid public document URLs
6. Onboarding
   - Role-specific checklists, owner, due date, reminders, completion and acknowledgement
   - Contact verification, identity documents where legally necessary, policy acknowledgement, training, equipment/access checklist
7. Time & Leave (later phase)
   - Attendance, shifts, leave requests, balances, holidays, timesheets; only enable payroll/legal rules after requirements review
8. Performance & Growth (later phase)
   - Goals / OKRs, periodic review, structured feedback, training
9. Helpdesk & Policies (later phase)
   - HR queries, policy library, acknowledgement and SLA
10. Offboarding
   - Resignation/exit record, notice, handover, access revocation, final document checklist and exit feedback
11. Reports & Audit
   - Source-wise hiring, time-to-hire, pipeline conversion, interview scorecards, headcount, upcoming joining, onboarding overdue, commission accrual/approved/due, attrition
   - Export controls and audit trail for sensitive changes
12. Settings
   - Roles and permissions, departments/designations, job templates, workflow configuration, document templates and retention rules

## UX standards
- Premium teal/ink/gold palette, spacious responsive layout, clear typographic hierarchy, accessible contrast, restrained icons, sticky left sidebar on desktop, collapsible navigation on mobile, breadcrumbs, global search, quick actions, notifications, command-style create menu, meaningful empty/loading/error states.
- Table and Kanban views, filters, saved views, sorting, pagination, row-level quick actions, record detail drawer/profile with activity timeline.
- Never rely on colour alone for status. Use labels, keyboard-friendly controls, visible focus, confirmation on destructive actions, duplicate-submit protection and actionable error messages.
- Candidate-facing application form and status portal should be a later separate public surface; never expose internal HR pages or candidate records publicly.

## Workflow / automation requirements
- Configurable hiring pipeline per job.
- On stage change: create next tasks, log who changed what, optional notification if a free and configured channel is available.
- Offer must remain draft until required fields and approval are completed.
- On acceptance: prepare onboarding tasks from the role template; do not automatically create user accounts or grant access.
- On exit: checklist and explicit access-removal confirmation.
- All automation should be idempotent, auditable, retry-safe and visible to an admin.

## Security and reliability gates
- Separate HR tables, RLS enabled on every exposed table; admin-only access initially. Do not alter customer_enquiries schema/policies.
- Use existing Supabase Auth session. No service-role key in client. Never publish private resume or signed-document URLs.
- Separate least-privilege roles before adding employee self-service or hiring-manager access.
- Validate fields server/database-side as well as UI; escape rendered user input; prevent duplicate submissions; handle auth expiry and network errors.
- Add tests for RLS denial, admin access, CRUD, search/filter, pagination, malformed inputs, XSS payloads, document drafts, onboarding status, responsive navigation and regressions in existing CRM tests.
- Run repository test command: `npm test` (current package script runs master-workspace, employee-ui and automation-audit tests). Add HR-specific test suite before release.
- Back up and review migrations. Never apply production migration, merge, or deploy without explicit approval.
- No honest promise of zero errors is possible; release only after tests and manual QA, with a rollback plan.

## Rollout
Phase 1: navigation, visual shell, secure people/recruitment data, flexible job type and compensation terms, interview notes/scorecards, document drafts and onboarding tasks.
Phase 2: role-specific workflows, activity history, approvals, reminders and reports.
Phase 3: employee self-service, attendance/leave/timesheets, performance, helpdesk, offboarding and integrations.
Phase 4: optional candidate portal, only after threat model and public-facing auth design.

## Current commission-only hiring role
- Role: Venue Listing Executive
- Locations: Delhi / Gurugram
- Source: Meta hiring ad / WhatsApp
- Compensation: commission-only / no fixed salary, only if that is the actual lawful arrangement and disclosed before interview/offer.
- Exact commission rate remains unset until confirmed. Written terms must define successful paid listing, payout trigger/timing, renewal eligibility, cancellations/refunds, proof and approval.
- Hiring pipeline: Applicant -> CV received -> Screening -> Interview -> Selected / Rejected / Hold -> Offer/engagement draft -> Approved -> Accepted -> Onboarding.
