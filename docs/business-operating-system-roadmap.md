# SMV Master CRM — Business Operating System Upgrade

## Release 1: Safe command-centre foundation
- Add a read-only Business OS overview to the Master CRM.
- Surface current lead queues, venue inventory and quick actions.
- Preserve existing CRM actions as the only source of truth.
- No database, RLS, customer enquiry, assignment, billing or partner workflow changes.

## Release 2: Operational intelligence
- Unified customer timeline and lead completeness indicators.
- SLA/response-time visibility and follow-up task health.
- Team workload and conversion reporting with role-aware access.
- Duplicate detection review queue; no automatic merges.

## Release 3: Venue matching intelligence
- Mandatory vs preferred requirement controls.
- Match confidence and missing-data penalties.
- Side-by-side venue comparison and customer-ready shortlist.
- Quote/RFP tracking, partner response status and date availability confirmation.
- Clearly distinguish indicative pricing from partner-confirmed quotations.

## Release 4: Platform integration
- Connect billing, partner, HR, employee and marketing analytics through shared navigation and reporting.
- Add auditable workflows and server-side pagination where needed.
- Preserve least-privilege access and existing partner isolation.

## Non-negotiable safeguards
- Do not alter `customer_enquiries` schema or its RLS policies.
- Do not expose one venue partner's enquiries to another partner.
- No automatic lead merge, venue assignment, booking, billing or outbound message.
- No paid AI/geocoding dependency without separate approval.
- Validate authenticated Master CRM, Employee CRM, Partner CRM and mobile before release.
