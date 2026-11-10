# SMV Enterprise Venue Assignment Centre

## Release objective

Make venue assignment the operational engine that converts customer requirements into accurate, partner-confirmed venue options and measurable bookings.

## Current implementation in this branch

- Enterprise Assignment Control Center inside the existing Master CRM assignment modal.
- KPI strip: approved/verified eligible supply, strong evidence matches, partner-confirmed availability, selected venues.
- Ranked default assignment list reuses the AI Venue Discovery scorer and eligibility rules instead of the legacy heuristic badge.
- Each venue row exposes fit score, data confidence and date-specific partner response state.
- A persistent selection basket summarizes selected venues and distinguishes already-active assignments from new assignments.
- A final human confirmation step previews the selected venue names before the existing save workflow runs.
- Enquiry-scoped Supabase Realtime subscription refreshes assignment state for the open enquiry; manual refresh remains the fallback when Realtime is unavailable.
- Existing assignment persistence remains in `crm-core.js`; this UI controller makes no direct database writes.

## Ranking model and interpretation

The existing AI scorer is the current single source of match evidence. It evaluates available signals such as locality/distance, guest capacity, indicative total budget, venue type, rooms, outdoor/indoor features, parking, food preferences and event suitability.

- **Fit score** measures how closely recorded venue attributes match the entered requirement.
- **Data confidence** measures how much of the weighted evidence is actually present in the venue record.
- **Partner availability** is a separate operational signal. A high fit score never implies the event date is available.
- **Unknown values** remain unknown. Staff must verify them with the venue.
- **Indicative budget** is not a final quotation and may exclude taxes, decor, room blocks and other package costs.
- The standard list keeps all approved + verified candidates visible. Hard blockers are surfaced for review rather than silently hidden from staff.

## Operational KPI definitions

| KPI | Definition | Owner/action |
|---|---|---|
| Eligible supply | Approved + verified venues returned by the existing assignment eligibility RPC | Venue Operations: grow verified supply in high-demand localities |
| Strong match | Fit score >= 80 and data confidence >= 70, with no eligibility blocker | Matching quality: review top candidates |
| Partner-confirmed availability | Assigned venue has an availability response of `available` for the enquiry event date | Partner Operations: reduce unconfirmed responses |
| Selected venues | Current assignment basket count | Sales: keep customer shortlist relevant |
| First partner response time | Time from assignment creation to first partner view/contact/availability response | Partner Success: monitor SLA |
| Site-visit rate | Enquiries with a recorded site visit / enquiries assigned to venues | Sales: improve follow-through |
| Booking conversion | Assigned enquiries converted to booked / assigned enquiries | Leadership: improve revenue conversion |
| Match-to-booking quality | Bookings and site visits attributed to the selected venue set | Matching: calibrate weights using sufficient sample size |

## Target service levels (proposed, not yet live-enforced)

- Enquiry triage: within 2 minutes during staffed operating hours.
- First shortlist: within 5 minutes for complete enquiries.
- Partner availability response: target within 30 minutes during staffed hours.
- Customer shortlist follow-up: same business hour after partner confirmation.
- Stale partner response escalation: notify the assigned team lead after 30 minutes; escalate again after 60 minutes.
- Booking outcome update: within 1 business day of customer confirmation.

These are proposed operating targets. They are not represented as automated alerts or guaranteed performance until monitoring and staffing policies are implemented.

## Next phases

1. Validate this unified ranking and basket with Master CRM staff and Employee CRM roles.
2. Add reasoned staff feedback and controlled ranking calibration.
3. Add response SLA queues and escalation visibility using existing assignment/availability events.
4. Validate partner A/B data isolation with two real test identities before any partner-facing change.
5. Add customer-ready shortlist generation and human-approved communication drafts.
6. Add funnel attribution and management reporting for match, partner response, site visit, negotiation and booking.
7. Consider new schema only if current records cannot safely represent a required metric; any migration requires separate review and approval.

## Release safety

- No changes to `customer_enquiries` schema or RLS.
- No changes to partner ownership mappings or current venue-scoped partner RLS.
- No direct production writes from the new controller.
- Existing assignment insert/reactivation/append-only behavior remains the persistence authority.
- No automatic WhatsApp or customer messaging.
- Do not merge/deploy until CI, browser regression and role-isolation checks pass.


Implementation note: the Account workspace menu remains independently scrollable on small viewports so the added enterprise workspace shortcuts do not become inaccessible.
