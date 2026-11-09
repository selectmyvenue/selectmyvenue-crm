# SMV Business Operating System — Expansion Plan

## Product objective
Evolve the Master CRM into an operating system for Select My Venue: customer acquisition and conversion, venue supply, partner operations, trust, team execution, billing, people operations, and management intelligence.

## Non-negotiable release invariants
1. The existing Master CRM home and Customer Enquiries workspace remain the default landing experience.
2. Do not move, reorder, replace, hide by default, or rewrite the existing Customer Enquiries content, tables, filters, forms, or assignment flow.
3. New workspaces mount as separate sibling sections and are opened only by an explicit navigation action.
4. Preserve the existing customer_enquiries schema. No migrations or column changes to that table.
5. Preserve current RLS and partner tenant isolation. Partner accounts must never gain direct broad access to customer_enquiries.
6. No paid API or external service dependency is introduced.
7. No production deployment or live data write is authorised by this branch.
8. New analytics are read-only unless a future separately reviewed feature explicitly requires a write.

## Existing foundation
- AI Venue Discovery: explainable match score, evidence confidence, capacity/budget/location/event requirements, partner availability response, match feedback, and historical outcome signals.
- Business OS launcher: navigation to Customer 360, AI Venue Discovery, venue inventory, plans, BI, billing, HR, marketing attribution and automation.
- Business Intelligence: read-only reporting over existing enquiries, team activity, venue assignments, billing, HR and recorded lead sources.
- Full CRM regression plan and static audit: separate authenticated test gate.

## New Growth & Quality Centre
The additive module in this branch provides:
- Locality demand vs verified inventory signal, grouped from recorded enquiry locations and approved/verified venues.
- Active lead completeness review for location, occasion, guests, budget, event date and mobile. Review action opens the existing enquiry; it does not edit it.
- Venue profile quality review for verification status, capacity, pricing and location. It distinguishes missing recorded information from a claim that a venue lacks a facility.
- Partner response health based on assignment/view/contact timestamps. A missing timestamp is not treated as proof of inactivity.
- Customer journey status distribution from existing enquiry records.
- Manual refresh and access-policy-aware error states.

## Next implementation phases
### Phase 1 — operational reliability and matching
- Complete authenticated Master, Employee, HR, Billing and two-partner regression.
- Validate match ranking against realistic customer requirements and venue records.
- Add an explainable match audit trail and human-reviewed match outcome calibration.
- Validate partner availability/quotation and response updates end-to-end.

### Phase 2 — customer and partner experience
- Customer shortlist and side-by-side comparison.
- Customer enquiry journey view with recommended venues, quotes, site visits and status.
- Partner response centre with clear SLA, availability, quote and site-visit states.
- Venue verification workflow with evidence, reviewer, and last-verified timestamp.

### Phase 3 — growth and management
- Locality inventory opportunity and acquisition prioritisation.
- Lead quality and duplicate detection (review suggestions only until approved).
- Partner plan renewal forecasting and listing quality score.
- Marketing attribution improvements using only connected/available data; do not infer ad spend or ROAS when absent.
- Executive operating scorecard and team coaching insights.

## Current implementation boundary
The Growth & Quality Centre is a first read-only increment, not a claim that all future customer portal, partner quotation, reviews, or automated messaging features are already implemented. The new module uses existing tables and columns only. It does not create, update, delete, assign, notify, message, or change permissions.

## Validation gate
- Run the complete npm test suite, including the Growth & Quality Centre safety contract.
- Confirm the existing Master homepage and Customer Enquiries DOM are unchanged by the new module.
- Confirm all new module selectors/styles are scoped to its own section.
- Run the authenticated two-partner isolation test with two distinct partner users and two distinct venues.
- Run Master and Employee role tests and verify HR/Billing access restrictions.
- Do not merge/deploy until all gates pass and the owner separately approves release.
