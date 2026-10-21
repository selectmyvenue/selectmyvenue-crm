# SMV AI-Powered CRM & Lead Operations — Audit and Requirements

Date: 2026-10-21
Branch: `feature/ai-crm-operations-control`
Scope: Master CRM, employee lead workflow, venue management, venue assignment, operational automation and attribution.
Status: Audit baseline plus first additive operations-control change in PR #30. This document does not authorize production deployment.

## Safety constraints

- Do not change, rename, drop, or repurpose the existing `customer_enquiries` table.
- Do not weaken or replace existing Supabase RLS policies, staff authorization RPCs, employee-save RPCs, partner ownership checks, or protected-field allowlists.
- Do not expose service-role credentials to browser code.
- Do not create synthetic/test leads in production.
- Do not merge or deploy this branch without explicit owner approval.
- Prefer additive UI/code and existing secure RPCs. Any schema or policy proposal must be documented separately and explicitly approved before implementation.

## Baseline observed in the current main branch

- Static dashboard includes Lead Management, Venue Management, and Billing Center.
- Master authentication checks for a session and calls `smv_is_active_staff`; the dashboard uses the existing Supabase publishable key.
- Employee CRM documentation describes the `agent` role, restricted save RPC `smv_employee_save_lead`, optimistic concurrency checks, activity attribution, and no direct employee lead INSERT/UPDATE/DELETE policy.
- Existing operations enhancement code includes a priority/action centre, follow-up overdue and due-today queues, uncontacted leads, unassigned-lead checks, duplicate hints, venue profile completeness, and stale-profile review.
- Existing venue-assignment integration has requirement parsing, venue readiness checks, a match score/shortlist, hard exclusions for known conflicts, match explanations, and WhatsApp handoff controls.
- Existing test suite scripts are `tests/master-workspace.cjs`, `tests/employee-ui.cjs`, and `tests/automation-audit.cjs`. This branch adds `tests/ops-audit.cjs` and includes it in `npm test`.
- Existing database documentation explicitly treats the 2026 security migration as production-critical and warns against rerunning older security SQL after it.

This baseline is source-code evidence only. It does not prove that every control works in the authenticated production deployment.

## Implemented on this branch (pending CI and review)

- Action Center now distinguishes leads without an internal staff owner (`assigned_to`) from leads without an active venue assignment.
- Ownerless active leads appear in the priority work queue with a `No staff owner` reason and a dedicated KPI. Terminal leads remain excluded from the active ownerless count.
- Active in-progress leads without a scheduled next follow-up now appear in the priority queue and a dedicated `Missing Follow-up` KPI. New leads remain covered by the separate first-response SLA, and terminal leads are excluded.
- Added synthetic-DOM regression coverage for both controls and wired it into `npm test` and the pull-request workflow.
- This is an alert/visibility feature only: it does not automatically reassign staff, write to production, or change database/security contracts.

## Prioritized requirements

### P0 — Reliability and operational control
1. Preserve lead visibility and unsaved edits during refresh, handle offline/query failures without clearing the last successful view, and make save errors visible.
2. Every lead in an actionable state must have a clear owner or appear in the unassigned queue.
3. Follow-up date/time must be consistent in India time; overdue, due-today, due-soon, and missing-follow-up states must be distinct.
4. Assignment actions must show selected venue count, current assignment state, save progress, partial failures, and a clear success/failure result. Prevent duplicate assignment writes on repeated clicks.
5. Keep a readable activity history for status, ownership, follow-up, venue assignment and outcome changes using existing safe logging paths.
6. Provide role-aware controls; hiding a button is not an authorization boundary. Backend RLS/RPCs remain authoritative.

### P1 — Explainable AI assistance
1. Parse customer requirements from structured fields and notes, but label inferred values and surface ambiguity for staff confirmation.
2. Match venues using event type, city/area, date, guest capacity, budget, food, room requirements and venue verification/approval status.
3. Treat unknown date availability as unknown, not available. Separate eligibility, confidence, warnings and ranking score.
4. Every recommendation should explain positive matches, exclusions and missing information.
5. Staff must be able to override recommendations with a reason. AI must not silently send messages, promise availability, or close a lead.
6. Track shortlist/assignment outcomes so later scoring can be evaluated against real conversions rather than assuming a score equals success.

### P1 — Manager command centre
1. Summaries for new/uncontacted, overdue follow-ups, unassigned leads, pending venue responses, upcoming site visits, duplicate candidates, and missing next action.
2. Filters by date, source, employee, status, city/area, occasion and venue.
3. Funnel reporting from enquiry to contacted, qualified, venue shared, site visit, converted/booked and lost, with explicit denominator definitions.
4. Employee performance based on valid assigned workload, contact timeliness, follow-up compliance and outcomes—not raw call count alone.
5. Organic/paid/source attribution carried through the existing enquiry flow without altering its contract or losing original source values.

### P2 — Venue quality and partner control
1. Venue lifecycle states (pending, verified, approved, public, inactive/suspended) are distinct and audited.
2. Flag duplicate venues, missing contact/location/capacity/price/event types, stale profile data, and public listings below the configured completeness threshold.
3. Track partner response time and unresolved assignments; allow authorised staff to reassign with a reason.
4. Enforce tenant isolation: a venue partner may only access that venue's authorised assignments and permitted fields.
5. Keep partner plan and billing operations separate from lead assignment logic.

## Acceptance test checklist

- [ ] `npm test` passes on this branch.
- [ ] Existing Master CRM and Employee CRM regression tests remain green.
- [ ] Synthetic browser fixtures only; no production test leads.
- [ ] Assignment tests cover empty selection, repeated click, duplicate assignment, failed save, partial failure, stale data and reassignment.
- [ ] Match tests cover known hard conflicts, unknown data, ambiguous notes, budget boundaries, date missing and date not confirmed.
- [ ] India timezone tests cover midnight boundaries and daylight/time parsing edge cases.
- [ ] Role tests cover active staff, inactive staff, employee, admin, anonymous visitor and partner cross-venue isolation.
- [ ] Security tests confirm no client-side privilege escalation, no service-role key in static assets, and existing RLS/RPC checks remain intact.
- [ ] Attribution tests verify source preservation and CRM ingestion using local/mocked fixtures or a staging environment.
- [ ] Live smoke tests are read-only unless separately approved; never submit a production enquiry as a test.
- [ ] Final manual sign-off covers desktop and mobile screens, keyboard/accessibility basics, and recovery after network failure.

## Delivery sequence

1. Run the full test suite and inspect current failing/passing results.
2. Fix confirmed P0 defects in this feature branch only.
3. Add focused regression tests before adding or changing automation.
4. Improve AI explanations and assignment failure handling without changing the database contract.
5. Add manager visibility and attribution diagnostics using existing data and safe queries.
6. Re-run tests, review the diff and prepare a release checklist.
7. Request explicit approval before merge/deploy. Database schema/RLS work, if ever needed, requires a separate reviewed proposal and approval.
