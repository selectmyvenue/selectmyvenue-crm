# Employee CRM — Today’s Work Queue

## Goal
Give telecallers one compact command centre for the next best action without changing the customer-enquiry data model or weakening existing access controls.

## Phase 1 in this branch
- Follow-ups due today, using India Standard Time (Asia/Kolkata).
- Overdue follow-ups, excluding terminal lead statuses.
- Untouched new leads, defined conservatively as status `new`, no `last_contacted_at`, and `contact_count = 0`.
- Quick filters open the existing enquiry list; agents continue to record outcomes and next steps through the existing guarded save RPC.
- Counts use existing `customer_enquiries` fields only. No schema/RLS changes, new RPCs, or production test leads.

## Semantics and safety
- A missing follow-up date is not counted as due or overdue.
- “Untouched” is a signal based on recorded CRM activity, not proof that no one contacted the customer outside CRM.
- Terminal statuses excluded from overdue: booked, converted, closed, lost, not-interested.
- A quick filter must never auto-assign a venue, change a lead, or send a message.
- Existing manual assignment, conflict detection, and activity logging remain unchanged.

## Acceptance checks
1. Queue cards render for desktop and mobile.
2. Due-today boundaries use IST midnight-to-midnight, including month/year transitions.
3. Overdue queue only includes past follow-up timestamps on non-terminal leads.
4. Untouched queue requires all three conservative conditions.
5. Selecting a queue card filters the existing lead list and does not write data.
6. Existing employee UI regression checks continue to pass.
7. No changes to `customer_enquiries` schema, RLS, or plan names.

## Follow-on backlog (separate reviewed PRs)
- Duplicate lead suggestions using normalized phone + event context; never auto-delete or silently merge.
- First-response SLA and lead-age bands.
- Match explanations with missing-data warnings and manual review.
- Manager dashboard for source quality, first-contact time, site visits, bookings, and lost reasons.
- Role/permission matrix review before expanding venue-partner access.
