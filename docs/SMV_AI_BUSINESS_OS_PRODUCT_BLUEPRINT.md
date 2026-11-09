# SMV AI-Assisted Business Operating System — Product Blueprint

**Product ambition:** Build Select My Venue into a complete, trusted venue-discovery, matching, partner-operations and business-management platform, starting with Delhi NCR.

**Implementation rule:** A feature is only called complete when it has a real data source, role-aware access, a working action path, failure handling, auditability where it changes data, and automated plus authenticated tests. A visual card or mock dashboard is not a completed feature.

## 1. Protected core and modular architecture

### Protected workspaces
- Master CRM home and Customer Enquiries.
- Existing enquiry intake, filters, table, detail modal, assignment and follow-up flows.
- Employee CRM and its permissions.
- Partner CRM and its venue-scoped access.
- HR and Billing portals.

New tools are separate sibling workspaces launched from Business OS. They must not reorder, replace, restyle globally, hide by default, or intercept Customer Enquiries. No migration or column change to `customer_enquiries` is allowed in this programme.

### Integration approach
- Reuse the existing authenticated Supabase client and existing role-aware RLS.
- Use read-only views/queries for analytics; use existing approved workflows for writes until a dedicated, reviewed API/RPC is built.
- Use Supabase Realtime subscriptions only where the table is enabled in the Realtime publication and the signed-in role is authorised. Always provide manual refresh and a clear disconnected state.
- New persistent capabilities belong in new, purpose-built tables/RPCs with explicit RLS—not extra columns on `customer_enquiries`.
- No service-role key in browser code, no credentials in Git, no paid API dependency.
- Keep AI explainable and human-controlled. Local rules and ranking can work without paid LLM calls; label generative AI unavailable when no approved provider is connected.

## 2. Existing capabilities to connect, not duplicate
- AI Venue Discovery is already embedded in the venue assignment workflow.
- Business OS launcher routes to customer workspace, venue inventory, plans, BI, Billing, HR, marketing and automation.
- Business Intelligence reports on enquiry, employee, partner, billing and HR records subject to access.
- Growth & Quality Centre analyses lead completeness, verified inventory, locality demand and partner timestamp signals.
- Existing Partner CRM handles assigned customer enquiries and partner venue context.

## 3. Newly added increment in this branch: Live Operations Desk

The Live Operations Desk is an additive, read-only workspace. It:
- Loads authorised open enquiries, follow-up dates, contact timestamps, venue verification status and partner assignment timestamps.
- Highlights overdue/due-today follow-ups and leads with no recorded first contact after a four-hour review threshold.
- Summarises approved + verified venue supply by city.
- Summarises partner viewed/contacted/site-visit timestamps.
- Links each work item back to the existing enquiry detail workflow and links venue supply to existing Venue Management.
- Subscribes to Realtime changes on existing enquiry, venue, assignment, follow-up and activity tables where Realtime is enabled; manual refresh is retained.
- Uses no writes, migrations, new paid APIs, or new permissions.

The four-hour signal is a prioritisation rule, not an SLA promise or evidence that a call was not made. Only recorded data is counted.

## 4. Full product modules and acceptance criteria

### A. AI Matching & Recommendation Engine V3
- Normalize locality names and maintain approved locality aliases.
- Hard eligibility gates: event type, verified capacity, budget model, date availability, venue status and partner eligibility.
- Soft ranking: distance, guest fit, budget fit, food, rooms, parking, indoor/outdoor, amenities, verified photo/profile quality, response reliability and historic outcomes.
- Distinguish exact data, partner-confirmed data, inferred data and missing data.
- Explain every score: matched factors, penalties, unknowns and confidence.
- Compare up to 3–5 venues and preserve the customer's hard constraints.
- Never describe an unknown price/date/capacity as confirmed.
- Acceptance: deterministic fixture tests for boundary values; human-reviewed ranking set; no match may bypass approval/verification gates.

### B. Real-time availability and quotation workflow
- Date-scoped availability requests with available / unavailable / needs clarification / tentative states.
- Quote builder with venue packages, inclusions, taxes/fees where recorded, validity, exclusions and revision history.
- Partner response timer and reminders; manual fallback if Realtime or notification provider is unavailable.
- Master can compare quotes and record customer decision/site visit.
- Acceptance: partner A cannot read/update partner B response; every quote has owner, venue, timestamp and version; no automatic customer message without explicit approval.

### C. Customer 360 and customer journey
- Unified timeline from enquiry, calls/contact outcomes, follow-ups, recommended venues, assignments, availability, quotes, site visits and conversion.
- Saved shortlist and side-by-side compare.
- Customer-facing tracking link only after a secure tokenised portal is designed and reviewed.
- Customer consent, expiry, revocation and PII minimisation required.
- Acceptance: event timeline is chronological and sourced; customers can see only their own enquiry; no public sequential IDs or direct table access.

### D. Partner Response Centre
- Partner inbox limited to assigned venue enquiries.
- Acknowledge, availability, clarification, quotation and site-visit response.
- Response SLA based on actual timestamps and working-hour policy.
- Venue owner profile, listing quality, package and media updates.
- Partner dashboard for enquiry, response, site visit, booking and renewal performance.
- Acceptance: two-account reciprocal tenant tests at API/RLS level and browser level; direct-ID and storage-path probes in staging.

### E. Venue Trust & Verification
- Verification workflow for business identity/contact, address/map pin, capacity, package pricing, photos and facilities.
- Evidence attachments, reviewer, verification state, last verified timestamp and re-verification reminders.
- Separate factual verification from marketing copy.
- Acceptance: unverified or rejected venues are not labelled verified; edits trigger review where material; evidence access is role-scoped.

### F. Employee execution and coaching
- Role-based work queues, follow-up calendar, call outcomes, next-best action and workload balance.
- Team coaching based on recorded activity and conversion, not vanity call counts.
- Employee cannot delete enquiries or access HR/partner administration without permission.
- Acceptance: all writes remain attributed to authenticated staff and appear in activity history.

### G. Billing, plans and partner success
- Preserve Launch Trial, Partner, Growth and Premium plan names.
- Trial/renewal timeline, manual ledger, invoice history, payment reconciliation and expiry alerts.
- Revenue reporting must distinguish invoiced, received, overdue and forecast.
- Acceptance: calculations reconcile to ledger; no automatic payment capture or GST claim without verified business configuration.

### H. Growth, SEO and marketing intelligence
- Source attribution, locality demand gaps, inventory acquisition priority, organic landing-page performance and lead quality.
- Connect actual GSC/GA4/Meta/Google Ads data only through authorised connectors or exports.
- Do not invent spend, conversions, ranking, ROAS or source labels.
- Acceptance: attribution lineage and freshness visible; unknown remains unknown.

### I. Executive Control Tower
- Daily operating summary: demand, first response, overdue follow-ups, match coverage, partner response, site visits, bookings, revenue and renewal risk.
- Filters by city, locality, event, source, employee, venue and time period.
- Drill-down always routes to the underlying authorised record.
- Acceptance: every KPI has a defined formula, source table, time window and permission behaviour.

### J. AI Copilot and workflow automation
- Natural-language search over authorised CRM context.
- Draft call summaries, follow-up messages, quote explanations and customer responses for human review.
- Suggested next actions and match explanations with citations to source fields.
- Automation rules for reminders and task creation only after idempotency, consent, audit and failure/retry controls are tested.
- No autonomous customer messaging, booking confirmation, price promises or data mutation without explicit approved workflow.
- No paid LLM dependency in initial release; rule-based intelligence first.

## 5. Navigation model
Business OS is the app launcher. Group tools by:
1. **Sell & Serve:** Customer 360, AI Match, availability, quotes, customer tracking.
2. **Supply & Partners:** venue inventory, verification, partner response, plans and renewals.
3. **Run the Team:** Live Operations, employee workspace, follow-up calendar, HR.
4. **Grow:** Growth & Quality, SEO, marketing attribution, locality acquisition.
5. **Manage:** Executive Control Tower, Billing, reports, settings and audit.

Keep Customer Enquiries as the default Master CRM home. Every module has a visible Back to Business OS action and a breadcrumb/title. Mobile navigation exposes the same modules without forcing the Enquiries page to move.

## 6. Delivery sequence

### Stage 0 — safety foundation (current)
- Separate development branch and draft PR.
- Regression matrix, static contracts and two-partner test accounts.
- Existing customer enquiry schema/RLS preserved.

### Stage 1 — connected operations (current branch increment)
- Growth & Quality Centre.
- Live Operations Desk with authorised data, manual refresh and Realtime where enabled.
- Navigation links back to existing enquiry and venue workflows.
- Run full tests and inspect latest CI before considering merge.

### Stage 2 — matching and partner workflow
- Matching V3 hard-gates and explainability.
- Synthetic enquiry fixture in staging.
- Partner availability and quotation workflow using dedicated new tables/RPCs if existing schema is insufficient.
- RLS tests for both partners and Master/Employee.

### Stage 3 — Customer 360 and trust
- Timeline, shortlist, quote comparison, site visits.
- Venue verification evidence and review states.

### Stage 4 — team, billing and growth automation
- Follow-up calendar, employee coaching, renewal intelligence, SEO/marketing attribution and human-approved automations.

### Stage 5 — customer portal and AI copilot
- Secure customer tracking, consent and token lifecycle.
- Natural-language copilot, draft generation and audited recommendations.

## 7. Release gates and change control
- Every stage has a separate PR and isolated tests.
- No direct commits to production/main.
- No production data writes or migrations from development branches.
- Compare dashboard and Customer Enquiries DOM/stylesheet before and after every module.
- Automated tests must prove new selectors/styles are scoped and new modules mount as siblings.
- Verify query errors and Realtime disabled states; no fake "live" status.
- Test Master, Employee, two partner accounts, HR and Billing.
- Run staging synthetic write tests before any new write workflow.
- Owner approves each production release separately.


## Implementation update — Smart Match Desk V3 (2026-11-09)
A separate Business OS workspace has been added to the Master CRM dashboard:
- Selects an existing open enquiry from `customer_enquiries` using read-only access.
- Reads approved + verified venues from `venues`.
- Scores locality text, capacity, per-person budget, event suitability and recorded food information.
- Displays match score, data confidence, reasons and missing/unknown evidence.
- Excludes venues not approved + verified and blocks known capacity/budget mismatches.
- Optional strict capacity filter requires a listed capacity fit when enabled.
- Provides a drill-down to the original enquiry detail modal.
- No automatic assignment, status mutation, customer message, availability promise or booking.
- No schema, RLS, production data or paid API changes.

The existing AI Venue Discovery in the assignment modal remains available. This new desk is an independent executive/staff-side entry point; it does not replace the original matching flow.

Automated contracts were added to `npm test`. Browser-level validation and CI confirmation are still pending.


## Implementation update — Partner Response Centre (2026-11-09)
A separate Master CRM workspace now monitors the existing partner response workflow:
- Reads `venue_enquiry_assignments` with related customer enquiry and venue details.
- Reads `venue_partner_availability_responses` for availability, quote, partner note and confirmation timestamp.
- Filters by responded / available / unavailable / needs information / awaiting response / no reply after 24 hours.
- Search by customer, venue, area and event; sort by assignment date or quoted amount.
- KPI summary and direct drill-down to the original Customer Enquiry detail.
- Uses existing RLS and partner ownership boundaries; no new tables or policies.
- Read-only in Master: it does not edit enquiry status, assignments, quotes or partner responses.
- Realtime subscriptions are attempted for assignment and partner response tables, with manual refresh and visible fallback messaging.

Partner availability/quotation entry remains in the existing Partner CRM workflow; this Master module is its operational monitoring counterpart. No Customer Enquiries page markup, layout, CSS, schema or RLS policy was changed.
