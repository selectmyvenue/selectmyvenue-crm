# SMV Smart Assignment 2.0 — Current-State Audit

**Audit date:** 10 November 2026  
**Repository baseline:** `main`  
**Development branch:** `feat/smv-smart-assignment-v2-audit`  
**Scope:** Master CRM assignment modal, AI Venue Discovery, venue assignment persistence, partner response/RLS model.

## Executive summary

SMV already has a meaningful foundation: staff-only assignment eligibility RPCs, verified-venue filtering, duplicate-safe assignment persistence, cancelled-assignment reactivation, an AI Venue Discovery panel, explainable fit/confidence scores, a comparison view, partner availability responses, and venue-scoped partner RLS.

The next release should **orchestrate and strengthen these existing capabilities**, not replace the assignment table or create a parallel assignment system.

No production data, schema, policies, assignments, partner access, WhatsApp messages, or customer enquiries were changed during this audit.

## Existing end-to-end workflow

1. Staff opens a customer enquiry and launches the Venue Assignment modal.
2. The modal loads staff-eligible venues through `smv_assignment_hidden_venue_ids` and `smv_assignment_venues`; a documented fallback reads approved + verified venues if the eligibility RPC fails.
3. The standard list shows venue name, area/city, capacity, per-person price, venue type, verification label and plan-expiry warning.
4. AI Venue Discovery is embedded in the same modal. Staff can enter free-text call notes, preferred areas, guest count, total budget, venue type, event date, rooms, parking and food preferences.
5. The matcher returns exact-area and nearby options with fit score, data confidence, evidence/reasons, missing-data warnings and an optional 3-venue comparison.
6. `Add to shortlist` checks the corresponding standard assignment checkbox. The assignment save merges the manual checklist and AI shortlist unless staff has explicitly edited the checklist; manual checklist edits then become the source of truth.
7. Save checks current assignment rows, avoids duplicates, reactivates cancelled rows rather than inserting duplicates, and appends new assignments. Existing active assignments are not removed by omission from the current selection.
8. Partner progress is reflected through assignment status fields and a separate date-specific availability response table.

## Live database facts (read-only aggregate/schema inspection)

- `venue_enquiry_assignments`: 261 rows across 119 enquiries.
- Status counts: 246 `assigned`, 3 `booked`, 12 `cancelled`.
- Existing progress markers: 4 viewed, 3 contacted, 3 converted, 1 site visit. These are counts of populated timestamp fields, not necessarily unique enquiries.
- A unique constraint exists on `(enquiry_id, venue_id)`; the supported re-assignment path is to reactivate the cancelled row.
- The assignment table has a constrained status set: assigned, viewed, contacted, detailed_shared, follow_up, site_visit, negotiation, booked, lost, cancelled.
- Staff policies exist for assignment CRUD, while partner SELECT/UPDATE policies scope rows through an active `venue_partner_profiles` record for the same venue and authenticated user.
- Availability-response partner policies additionally bind the response user, active venue profile, assignment ID and venue ID.
- `customer_enquiries` RLS is enabled. Its schema was not modified.

## Findings and gaps to address

### P0 — Correctness and safety

1. **Two different recommendation experiences:** the standard list's `Recommended` badge uses a simple city/capacity/event heuristic; the AI panel uses a richer scoring engine. This can confuse staff because the two lists may rank or label a venue differently.
2. **Total budget is an estimate:** the matcher estimates `max per-person price × guest count`. This is not a confirmed event quote and excludes possible taxes, venue rental, decor, rooms and package-specific terms. UI must label this as an indicative estimate, not a quote.
3. **Missing data must remain unknown:** a missing price, capacity, facilities value or location coordinate must never be represented as a verified fit. Preserve the existing strict-capacity option and make confidence/missing evidence visible.
4. **Date availability is partner-confirmed only:** an event date in the enquiry does not prove availability. The system must distinguish confirmed available, confirmed unavailable, needs-info and not-yet-confirmed.
5. **Selection state needs one visible source of truth:** AI shortlist and standard checkboxes are merged by code. The redesign must show a persistent assignment basket and clearly explain when manual edits override the AI shortlist.
6. **Duplicate and reactivation safety is essential:** preserve the unique constraint and current append-only semantics. Never cancel or reset an active assignment just because it was not checked in the latest modal.
7. **Partner isolation is a release gate:** any change to partner-facing data access must be verified using two distinct partner identities. Do not weaken current venue-scoped RLS.

### P1 — Operational experience

- Replace the alphabetic default list with a unified ranked shortlist, while retaining an all-eligible-venues view and search.
- Add explicit match dimensions: location, capacity, budget estimate, venue type, event suitability, rooms, parking, catering, data confidence and partner availability.
- Show exclusion/verification reasons rather than silently dropping every unsuitable venue.
- Add an assignment basket with selected count, already-assigned state, new vs reactivated counts, and a final confirmation summary before saving.
- Make partner response SLA, quote amount, quote timestamp, event date and overdue state visible together.
- Make replacement/reassignment history clear without destroying the original assignment audit trail.

### P2 — Learning and automation

- Capture staff feedback (good fit / not suitable) with a reason and rank position.
- Evaluate match quality against real downstream outcomes (site visit, negotiation, booked, lost), not raw clicks.
- Calibrate venue recommendations only when there is sufficient sample size; avoid overfitting venues with one or two assignments.
- Add human-approved WhatsApp drafts and partner follow-up reminders. No autonomous send in the first release.

## Target Smart Assignment 2.0 experience

1. **Requirement Brief:** prefill saved enquiry fields; allow staff to correct parsed call notes and flag missing critical details.
2. **Ranked Match Board:** one consistent ranking engine for the standard list and AI discovery; show score, confidence, why it fits, what is unknown, and hard blockers.
3. **Compare:** side-by-side comparison for up to 3–5 selected venues (final count to be chosen after UI performance test).
4. **Assignment Basket:** selected venues, already active, cancelled/reactivation candidate, partner availability and estimated quote range.
5. **Human Approval:** a final summary before committing assignments; separate approval for WhatsApp send.
6. **Partner Response Tracker:** availability, quote, note, response age, SLA, site visit and conversion progress.
7. **Outcome Learning:** feedback and funnel outcomes inform future ranking with transparent, reversible weights.

## Implementation plan

### Phase 1 — Audit and acceptance criteria (this branch)
- Confirm assignment persistence, duplicate/reactivation, removal, WhatsApp action and partner isolation.
- Document status transitions, required fields, edge cases and regression fixtures.
- Keep all production writes and schema changes out of scope.

### Phase 2 — Matching consistency (development branch)
- Reuse the current AI scorer as the only recommendation source.
- Align the default venue list's recommendation badge/order with the AI match board.
- Clearly distinguish fit score from data confidence and partner-confirmed availability.
- Add unit tests for unknown capacity, budget estimates, distance uncertainty, event date and hard blockers.

### Phase 3 — Assignment basket and approval
- Add a persistent basket, selected count, duplicate/reactivation summary and final approval step.
- Preserve current save semantics and the existing unique constraint.
- Keep WhatsApp as a separate, explicit action after assignment save.

### Phase 4 — Partner response and learning
- Improve response/quote visibility using existing assignment and availability tables.
- Add reasoned feedback and outcome measurement using existing feedback table where supported.
- Propose any additional schema only after proving it cannot be represented safely by current tables; submit a separate migration for explicit review.

### Phase 5 — Regression and controlled release
- Run static/unit/browser regression.
- Verify master CRM and employee permissions.
- Verify partner A cannot see partner B's assignments, customer details or availability responses.
- Verify existing assignments and WhatsApp path remain intact.
- Deploy only after review and explicit approval.

## Non-negotiable constraints

- Do not alter `customer_enquiries` schema.
- Do not change current RLS policies or partner ownership mappings as part of UI/matching work.
- Do not modify existing assignment rows as part of development.
- Do not send WhatsApp messages automatically.
- Do not introduce paid AI/API dependencies in the initial release.
- Keep the current assignment flow available until the replacement passes regression.
