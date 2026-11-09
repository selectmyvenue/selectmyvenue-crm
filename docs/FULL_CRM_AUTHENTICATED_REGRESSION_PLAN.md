# SMV Full CRM Authenticated Regression Plan

**Scope:** Master CRM, Employee CRM, Venue Partner CRM, HR Portal, Billing Centre, customer enquiry intake, venue matching, partner availability, and connected workflows.

**Execution mode:** Audit first. Read-only production inspection is permitted. Do not deploy, run production migrations, alter RLS, mutate customer records, send messages, create invoices, or change partner assignments as part of this audit.

## Release safety invariants

1. Preserve the existing `public.customer_enquiries` table and all of its columns, constraints, triggers, and policies.
2. Preserve existing RLS policies and the venue-partner tenant boundary. A partner must never read or mutate another venue's enquiries, availability responses, notifications, billing, or profile data.
3. Preserve Master CRM, Employee CRM, Partner CRM, HR and Billing workflows and their current authentication namespaces.
4. No paid API or new paid service. No credentials, service-role keys, OTP secrets, or customer PII in test fixtures, screenshots, logs, or Git.
5. Do not use real customer leads for destructive tests. Use synthetic records in an isolated test project or dedicated test accounts with explicitly approved test data.
6. No production deployment. A passing test suite is not deployment approval.

## Current evidence and coverage boundaries

- Existing `npm test` covers Master lead workspace, Business OS navigation, AI venue discovery, employee UI, automation/matching helpers, HR portal contracts, Business Intelligence, and partner availability contracts.
- Existing browser smoke checks the Master login, partner-login redirect, and Employee login on mobile and desktop. It does not exercise authenticated business actions.
- Existing database tests use isolated PostgreSQL fixtures. They are not a substitute for two real partner accounts in the live Supabase project.
- The Partner CRM login redirects to `partner.selectmyvenue.com`; its authenticated app is a separate origin and is not represented by a local `partner/` directory in this repository.
- The new static audit checks entry-point wiring and access-control contracts only. It does not claim authenticated end-to-end coverage.

## Authenticated test matrix

Run first against an isolated staging/test project. For live production, restrict the first pass to read-only checks until the user explicitly authorizes synthetic test data.

| Area | Role / setup | Test cases | Expected result |
|---|---|---|---|
| Master login/session | Active staff admin | Login, reload, session restore, logout, expired session | Correct redirect and session handling; no console errors |
| Enquiry intake | Synthetic customer | Submit each website enquiry path; verify required fields, source, date, phone and structured requirements | Exactly one correctly attributed row appears in `customer_enquiries`; no duplicate submission |
| Lead workspace | Master admin | Search, filters, date ranges, pagination, sorting, detail modal, comments, status, priority, follow-up | Correct records and updates; failed requests preserve unsaved edits |
| Customer 360 | Master admin | Open timeline for leads with and without assignments, follow-ups, site visits and conversion | Chronological, correctly linked events; missing data is not invented |
| Venue inventory | Master admin | Search, create/edit with synthetic venue, media upload, profile status, verification, plan view | Existing validation and workflows remain intact; no accidental publish or delete |
| Matching engine | Master admin | Exact/nearby locality, capacity boundaries, per-person vs total budget, event types, rooms, parking, food, indoor/outdoor, missing fields | Exclusions are correct; score and confidence are explainable; unknown data is labelled unknown |
| Availability | Master admin + partner | Set event date; partner marks available/unavailable/needs-info; refresh and realtime update | Only date- and assignment-scoped responses affect matches; unavailable venue is excluded |
| Assignment workflow | Master admin | Shortlist, select/deselect, assign, re-open, cancel/restore, WhatsApp draft preview | Correct assignment state and activity; no duplicate assignments or automatic outbound message |
| Partner tenant isolation | Two distinct partner test users linked to different venues | Read lists, direct record IDs, detail views, RPCs, updates, availability, notifications and file access | Partner A cannot read or mutate Partner B's data, even with guessed IDs |
| Partner operations | Partner A and B | View assigned enquiry, acknowledge, contact status, availability, follow-up, quotation and site visit | Changes stay scoped to the partner's own venue and appear in Master CRM only as permitted |
| Employee CRM | Active employee | Login, view leads, edit permitted fields, add notes/call outcomes, schedule follow-up, realtime refresh | Shared lead updates reach Master CRM; employee cannot delete leads or manage venues/accounts |
| Employee administration | Master admin | Create/deactivate/reactivate/reset test employee; review activity | Server-side active-staff authorization enforced; no credentials emailed or exposed |
| HR Portal | Active admin | People search, hiring stage, onboarding tasks, documents, draft letters, signed upload requirements, exports | HR-only access; draft/required-document safeguards work |
| Billing Centre | Active admin | Plan, trial, proforma invoice, manual payment entry, ledger, outstanding balance, renewal dates, print | Correct totals and dates; no payment gateway or automatic charge |
| Business Intelligence | Active admin | Refresh, periods, team conversion, overdue follow-ups, partner response, billing and HR visibility | Read-only, policy-aware, no fabricated ad spend or revenue |
| Mobile and accessibility | All test roles | 360px and 390px viewports, navigation, forms, tables, dialogs, keyboard focus | No clipped primary actions, horizontal page overflow, inaccessible controls |
| Failure/recovery | All test roles | Offline, timeout, expired token, denied RLS, double click, stale edit | Clear error state; no duplicate write; existing data and unsaved edits preserved |

## Two-partner isolation protocol

Use two dedicated test users, each linked to one distinct test venue. Create one synthetic enquiry and one assignment per venue in the isolated test project. Sign in as Partner A and attempt to read Partner B's assignment and availability response by direct ID, then attempt a mutation. Repeat in reverse as Partner B. Confirm the API returns no rows / permission denial and that no cross-tenant data is disclosed. Also test storage object paths and notification access if those features are enabled.

Never perform guessed-ID or cross-tenant mutation probes against real customer records in production.

## Live production read-only checks

1. Confirm each entry point loads and the correct role gate is visible.
2. With the owner operating their own authenticated browser session, inspect dashboard panels, venue matching, CRM queues, HR and Billing.
3. Capture only pass/fail and redacted error codes; do not export customer PII.
4. Inspect Supabase RLS policies, function grants, schema and logs without writing.
5. Do not treat HTTP 200, a login form rendering, or CI fixture tests as proof of authenticated workflow success.

## Findings to resolve before release

- Recheck SECURITY DEFINER function grants. A public venue-list function may intentionally be callable by anon; administrative/partner lifecycle functions must retain their internal authorization checks and should not receive unnecessary anon EXECUTE grants. Review each signature and caller before changing privileges.
- Review compromised-password protection in Supabase Auth and assess user impact before enabling.
- Review the reported foreign-key index and HR RLS initialization-plan warnings. Any index or policy change requires a separate migration, test evidence and approval.
- Verify the cache tables' intended access path; RLS enabled with no policies is default-deny, not by itself proof of a defect.
- Obtain authenticated test access through a dedicated test account/session. Do not place passwords or service-role credentials in chat or Git.

## Exit criteria

- All existing unit/contract tests pass.
- Static audit and live route smoke tests pass.
- Authenticated Master and Employee workflows pass.
- Two-partner cross-tenant isolation passes using dedicated test accounts.
- HR and Billing role checks pass.
- No unexpected console/network errors in supported browsers.
- Supabase schema/RLS diff confirms no change to `customer_enquiries` or partner isolation.
- User reviews the release summary and explicitly approves any deployment separately.


## Two-partner database isolation check — 2026-11-09

Two active test partner profiles were found and linked to separate test venues:
- Partner A → Test Venue (Delhi)
- Partner B → Test Venue 2 (Gurgaon)

The owner supplied a screenshot showing the Partner B session in the Partner CRM for Test Venue 2. The screenshot displayed zero assigned enquiries.

A read-only database RLS simulation was run for each partner identity using the PostgreSQL `authenticated` role and the corresponding JWT subject claim. No rows were inserted, updated or deleted.

| Dataset | Partner A / Test Venue | Partner B / Test Venue 2 |
|---|---:|---:|
| Visible venues | Test Venue only | Test Venue 2 only |
| Partner profiles | 1 | 1 |
| Assigned enquiries | 3 | 0 |
| Availability responses | 0 | 0 |
| Venue activity logs | 17 | 0 |
| Partner notifications | 9 | 0 |
| Partner-visible billing records | 0 | 0 |
| Direct `customer_enquiries` rows | 0 | 0 |

Result: the database RLS simulation showed no cross-venue visibility in either direction for the tested datasets. Both partners saw only their own venue/profile and associated partner-scoped records. Neither partner could directly read `customer_enquiries`.

Important limitation: this is a database-role/JWT-claim RLS simulation, not a full browser session test using each partner's real access token. The screenshot confirms the second Partner CRM session is open, but the first partner's browser session and the complete click-through flows (opening assigned leads, changing status, availability submission, logout/login) still require an authenticated browser run. Do not label the full end-to-end partner test as complete until those are exercised.


## Partner dashboard screenshot evidence — 2026-11-09

The owner supplied screenshots from both separate Partner CRM sessions:
- Partner A dashboard: Test Venue, Shakti Nagar, Delhi; dashboard shows 3 assigned enquiries, all displayed as Booked.
- Partner B dashboard: Test Venue 2, Gurgaon; dashboard shows 0 assigned enquiries.

The visible lead names/contact details in the screenshots are intentionally not copied into this test report. No lead status was changed and no customer data was modified.

Combined with the database RLS simulation recorded above, the screenshots are consistent with the expected tenant separation. They establish that both partner dashboards can load and show their respective venue context, but they do not by themselves prove every row-level browser query or mutation path. Remaining browser checks: open a lead's details under Partner A, confirm Partner B cannot open or discover it, and exercise only non-destructive/read-only actions. Do not change the Booked statuses of these existing records as part of testing.


## Partner lead detail and session controls — owner-reported — 2026-11-09

The owner supplied a screenshot of the Partner A lead-details modal opened from the assigned-enquiries list. The modal successfully displays the selected enquiry's detail fields inside the Partner CRM. The owner also reports that all Partner CRM buttons are working, including login and logout.

No customer-identifying values from the screenshot are reproduced in this report. No record was edited during this check.

Evidence classification:
- Lead detail modal opens: screenshot-confirmed for the shown Partner A record.
- Login/logout and all other buttons: owner-reported working; not independently exercised by the assistant.
- Reciprocal Partner B non-visibility: supported by the prior read-only RLS simulation and Partner B dashboard screenshot; a full browser-token attempt to access Partner A's specific lead was not captured.
- Status updates, availability responses, notifications and write actions: not tested using a synthetic enquiry and remain outside this read-only evidence.

This advances the partner read-path check, but does not by itself close the complete authenticated release gate.


## New Business OS workspaces — 2026-11-09

The following separate Master CRM workspaces were added on the audit branch:
- Growth & Quality Centre — read-only inventory, locality and lead-quality overview.
- Live Operations Desk — read-only follow-up and partner activity queue.
- Smart Match Desk V3 — explainable rules-based ranking against approved + verified venue inventory.
- Partner Response Centre — read-only monitoring of existing partner availability replies, quotations, response age and partner notes.

All four workspaces are additive. They do not modify the Customer Enquiries markup, CSS, filters, forms, table or assignment workflow. No schema, RLS, or production data changes are included. Each has a safety/contract test in the `npm test` chain.

The Partner Response Centre uses existing `venue_enquiry_assignments` and `venue_partner_availability_responses` tables, with the existing venue ownership RLS policies. Its Master-side UI is read-only; the partner's existing response workflow remains the write path.

Latest CI for commit `697d0333b96df346fbb697fca47f42d987f2bcaf`:
- HR Portal Regression Checks: passed.
- The test log shows all existing CRM regression suites and the new Growth & Quality, Live Operations, Smart Match Desk and Partner Response Centre safety contracts passed.
- Live CRM browser smoke test was still running at the time of this update.

The two partner accounts and screenshots documented above establish dashboard/read-only context and database RLS simulation, but a complete browser-token cross-tenant probe and partner write workflow still need controlled testing with synthetic data. Do not change the existing three booked enquiries in Partner A during this test.


### Customer 360 verification
Customer 360 is enquiry-centric and read-only. Test enquiries with:
- no assignments or follow-ups;
- one or more venue assignments and availability responses;
- CRM activity history and contact markers;
- site visit and conversion timestamps;
- missing optional fields and empty activity sets.

Expected: all events are attributed to the selected enquiry ID and ordered by event timestamp; absent fields display as not recorded; no automatic identity merge across enquiries; original enquiry modal opens without changing the selected record.


### Venue Trust & Profile Quality Centre verification
- Load venue inventory under an authenticated Master session; confirm counts match the same authorised venue set shown by Venue Management.
- Test search and every filter, including critical missing fields, incomplete/complete profiles and verification state.
- Select a venue with missing details and confirm the checklist identifies only absent source values.
- Confirm the module never writes to `venues`; it only links to existing Venue Management for authorised edits.
- Confirm completeness is not presented as proof of identity, licensing, pricing or availability verification.
- Confirm Customer Enquiries remains in its original DOM and layout while switching into and out of this workspace.
