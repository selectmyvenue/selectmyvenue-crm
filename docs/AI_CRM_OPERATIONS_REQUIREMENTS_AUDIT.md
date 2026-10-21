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
- Active in-progress leads without a scheduled next follow-up now appear in the priority queue and a dedicated `Missing Follow-up` KPI. This includes contacted, interested, qualified, detail-shared, site-visit, not-pick, follow-up and negotiation stages. New leads remain covered by the separate first-response SLA, and terminal leads are excluded.
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


## Recommended business-growth roadmap

### Phase A — Recover more leads already being paid for (highest priority)
1. **Speed-to-lead SLA:** record first human contact time, alert the owner at 5 minutes, escalate to the manager at 15 minutes, and report median / 90th-percentile response time by source and employee. Thresholds should be configurable and evaluated against actual lead volume.
2. **Next-action enforcement:** every active lead after first contact should have a dated next step; overdue and missing-next-action alerts already begin in this branch. Add bulk manager reassignment only after the audit trail and authorization path are verified.
3. **Lead-quality feedback:** require a structured outcome when a lead is lost or marked not-interested (unreachable, invalid number, budget mismatch, date unavailable, location mismatch, duplicate, booked elsewhere, other). Report quality by source/campaign without overwriting the original source.
4. **Follow-up workbench:** one daily queue per employee for first calls, callbacks, follow-ups, site visits and stale leads; managers see unworked and overdue queues without opening every lead.
5. **Human-approved messaging:** generate concise call openers and WhatsApp drafts from the customer's actual requirements, with one suggested next question. Keep send actions explicit; do not auto-send through the existing WhatsApp Business app.

### Phase B — Make venue assignment a conversion engine
1. **Explainable match score:** separate hard eligibility, match confidence, data completeness and venue quality. Show why a venue matches, what is unknown, and what must be confirmed. Never present unknown date availability as confirmed.
2. **Venue response SLA:** track assignment sent/viewed/responded/declined and response time. Escalate a non-responsive partner and let authorised staff reassign with a reason.
3. **Demand-versus-supply map:** report enquiry volume by locality, occasion, budget and guest count against verified, active, public venues that can serve those needs. Prioritise venue acquisition where genuine demand is underserved.
4. **Partner growth cockpit:** show profile completeness, enquiry response rate, venue views/leads where available, site visits, outcomes and plan renewal date. Keep private customer information restricted to the partner's own authorised assignments.
5. **Availability confirmation:** add a venue confirmation workflow for requested date and time. This should be a recorded partner response, not inferred from static venue data.

### Phase C — Measure marketing and revenue, not just activity
1. **Attribution integrity:** preserve the original source and capture available campaign identifiers (UTM/source/campaign/ad/form) at intake. Do not guess campaign attribution from customer names or notes.
2. **Funnel dashboard:** report enquiry → contacted → qualified → venue shared → site visit → booked/lost, with clear stage definitions and conversion denominators.
3. **Source ROI:** connect spend from available ad connectors to qualified leads, site visits and booked outcomes. Treat cost-per-lead as a diagnostic, not the final success metric.
4. **SEO demand loop:** combine Search Console landing-page/query performance with CRM enquiry location and occasion. Create or improve location pages only where venue supply and customer intent support useful, accurate content.
5. **Venue-owner acquisition pipeline:** prospect → contacted → demo/onboarding → profile complete → verified/public → first qualified lead → renewal. Measure time to first value and renewal, not only number of venues listed.

### Phase D — Automate safely once the data is reliable
1. Daily manager digest: unworked leads, overdue callbacks, pending venue responses, site visits today, expiring plans and high-intent enquiries.
2. Event-triggered notifications: new lead, ownership change, follow-up due, venue response overdue, site-visit reminder and plan expiry. Use existing notification infrastructure where possible.
3. AI call summaries / quality coaching only after call-recording/transcription consent, access controls, retention rules and provider cost are reviewed.
4. Predictive scoring only after enough reliable outcome data exists. Start with transparent rules; validate precision and conversion lift before using machine-learning scores for routing.

## Success scorecard

Establish a 2–4 week baseline before setting targets. Review weekly:
- Median and 90th-percentile time to first human contact.
- Share of active leads with an owner and a dated next action.
- Follow-ups completed on time.
- Venue assignment response rate and median response time.
- Enquiry-to-qualified, qualified-to-site-visit and site-visit-to-booked conversion.
- Invalid/duplicate lead rate by source.
- Cost per qualified lead and cost per booked event where spend and outcomes are available.
- Venue profile completeness, time to first qualified enquiry and partner renewal rate.

Do not promise a percentage increase in bookings before this baseline exists. Use staged experiments and compare cohorts to verify which changes actually improve outcomes.

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
