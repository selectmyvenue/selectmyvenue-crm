# CRM automation audit and assignment preparation

**Status: tested release prepared for publication on 22 September 2026. Deployment acceptance is tracked separately.**

Scope: existing Automation-1 through Automation-41A, then automatic preparation with a manual final Assign click. This report separates recovered release scope, simulated regression checks, live read-only observations, and unverified operations. It does not certify every historical automation as passing.

## Evidence and limits

- Baseline: `bb337a2278831d147419b1f686d72e64242094c6`.
- Original release asset tags recover Automation-6–41A. Core-loader tags recover 23, 27, 36 and 40. Automation-1–5 have related earlier implementation commits, but no authoritative number-to-feature mapping was found; they remain unmapped rather than being guessed.
- Automation-41 was explicitly rolled back; its room/Both-food intent is now regression-tested in the current parser. 41A COMMENT refresh and room extraction are tested separately.
- Live authenticated read-only inspection confirmed lead search, assignment dialog, room details, match reasons, All Venues, COMMENT viewing and a repeated Venue Assistant empty-state error. No live lead was edited, no final assignment was submitted, and no external message was sent.
- Supabase schema/trigger reads initially succeeded. Later connector calls failed with `Invalid MCP request metadata`, so aggregate checks, advisor checks, notification delivery, partner-isolation revalidation and concurrent cross-session assignment constraints are NOT certified.
- GitHub connector access recovered on 22 September 2026. The tested release is being published atomically; post-deployment acceptance remains a separate check.

## Numbered register

“Pass” below means the indicated local simulated scenario, not an end-to-end production write or delivery test. “Reviewed” means code/markup review only.

| Automation | Recovered scope | Evidence / result |
|---|---|---|
| 1 | Exact historical label unavailable | Unmapped; original checklist needed |
| 2 | Exact historical label unavailable | Unmapped; original checklist needed |
| 3 | Exact historical label unavailable | Unmapped; original checklist needed |
| 4 | Exact historical label unavailable | Unmapped; earlier `smartmatch-4` release is not proof of Automation-4 scope |
| 5 | Exact historical label unavailable | Unmapped; original checklist needed |
| 6 | Matching/WhatsApp controls mount | Pass, DOM integration mount; release `27ea3bc` |
| 7 | Connected core boot, movable lead workspace | Pass boot; drag layout reviewed; `3b8a9bd` |
| 8 | Match explanations and unknown rooms | Pass reason chips and confidence; `4faceff` |
| 9 | Compact Venue Assistant | Pass render; empty-state crash fixed; `3930a2f` |
| 10 | Assign then WhatsApp | Pass failure boundary and draft/queue; delivery untested; `7bb889b` |
| 11 | Assistant venue loading before assignment | Pass with mocked inventory; signed-in live inventory read observed; `e5c0581` |
| 12 | Larger movable details, exclusion summary | Summary reviewed/tested; visual drag not certified; `b62132b` |
| 13 | Deterministic Save & Find Matches | Pass: only confirmed successful save advances; `c67ba1b` |
| 14 | Matching completeness | Pass; now counts note-derived fields and explicit negatives; `d49c5ac` |
| 15 | Budget tolerance and indoor signals | Budget pass; indoor parser reviewed; `6d1352f` |
| 16 | Inferred requirements visible | Pass parsing and assistant summary; `67bcb25` |
| 17 | Cached inventory, multi-venue WhatsApp queue | Queue pass; empty inventory cache fixed; real delivery untested; `72ac907` |
| 18 | Assignment history and period counts | India-time range boundaries pass; history rendering reviewed; database totals not certified; `c90e27e` |
| 19 | Requirement conflicts | Pass structured-vs-COMMENT conflict checks; `85d57d7` |
| 20 | Match tiers and filters | Pass; same tier rules now used by assistant and list; `c2d65d0` |
| 21 | Full-screen assignment and room details | Room metadata pass; full-screen markup/CSS reviewed; `b1d767b` |
| 22 | Food and unknown-data accuracy | Pass unknown-data confidence and explicit food support; `2488095` |
| 23 | Main enquiry location dropdown | Dropdown and legacy value tests pass; `5640c9c` |
| 24 | Requirement-based reliable matching | Pass rooms/capacity/food and insufficient data scenarios; `fcd2563` |
| 25 | Food parsing correction | Pass veg/non-veg variants; `efa9c1f` |
| 26 | Assistant reliability alignment | Pass assistant render and shared tier logic; `04782d8` |
| 27 | Assignment save result, skip disabled/already assigned | Save failure and hidden-selection tests pass; `a438a1d` |
| 28 | WhatsApp only after confirmed new assignments | Code review + failure boundary pass; no messages sent; `482de93` |
| 29 | Assignment state reset between leads | Pass selection reset, changed-note recompute, manual deselection; `4d5f2aa` |
| 30 | Negative requirements | Pass no-room/no-non-veg variants; parser remains rule-based, not universal language understanding; `a1410be` |
| 31 | Venue type normalization | Pass farm house / party hall aliases; `6a7ae0a` |
| 32 | Premium manual review workspace | DOM cards/reasons pass; broad visual acceptance pending; `0e94c4a` |
| 33 | Full capacity range | Pass minimum and maximum guests; `7e64533` |
| 34 | Explicit food must-have | Pass mismatch exclusion, explicit false overrides description; `68b52ac` |
| 35 | Larger venue area and broad search | Search/card DOM pass; visual sizing reviewed; `e573800` |
| 36 | Database recheck before assignment | Simulated recheck and repeated-click tests pass; cross-session database uniqueness not certified; `273f553` |
| 37 | Materially over-budget exclusion | Pass allowed tolerance and hard budget excess; `cb253f5` |
| 38 | Precise location matching | Pass city aliases, sector mismatch, alternative areas; same-region alternative is clearly Possible, not auto-selected; `e3522ea` |
| 39 | Confirmed room search; hide unknown price/room labels | Pass confirmed room search; metadata review; `fac0662` |
| 40 | Search switches to All Venues | Pass actual search input event; `e341d11` |
| 41 | Room and Both-food parsing, later rolled back | Historical rollback retained in register; current equivalent scenarios pass; `25f9e09`, rollback `62c99aa` |
| 41A | Explicit room priority and fresh saved COMMENT | Pass supported room formats, latest saved note refresh and stale-lead protection; `167d84b` |

## Fixes in this release

1. Removed Venue Assistant's reference to uninitialized `spec` when no lead is open; avoid needless repeated renders and stale asynchronous lead results.
2. Count inferred food/guests/budget and explicit no-room/no-parking answers in completeness.
3. Respect explicit venue food booleans instead of contradicting them using free-text descriptions.
4. Normalize WhatsApp numbers and prepare a queue after successful assignments. Opening WhatsApp is not a delivery receipt. No WhatsApp Business API sender is configured by this change.
5. Preserve selected venues across filters; prevent repeated in-flight assignment saves and retain the original lead identity across asynchronous work.
6. Preserve user-edited message drafts; generated drafts include parsed location, room count, food, guests, budget and facility preferences without copying internal office notes verbatim.
7. Keep Call Back (legacy stored status `converted`) active in lead follow-up queues. Venue-assignment `converted` semantics are unchanged.
8. Apply Asia/Kolkata boundaries and exclusive upper limits to assignment history periods.
9. Preserve location alternatives from comments. Wrong-area venues cannot be 100%/Strong solely because the city matches; appropriate same-region alternatives appear as Possible when no Strong match exists.

## New automatic preparation

- When opening assignment, calculate a shortlist of at most three strong, approved and verified venues, accounting for already assigned venues.
- Do not auto-select missing/unknown must-have data, known mismatches, terminal customer leads, or merely Possible alternatives.
- Notes/requirements or inventory changes recalculate the prepared shortlist; ordinary filtering does not undo the user's manual deselections.
- Prepare the assignment message automatically. The user can review/change selections and message.
- **No assignment is inserted until the user clicks Assign.** No background messages or timed assignments were added.
- Preparation is browser-side while CRM is open. It is not a 24/7 server automation engine.

## Research applied

The design adopts relevant capabilities from established CRM documentation, not a claim to have audited every competing product:

- [HubSpot lead scoring](https://knowledge.hubspot.com/scoring/understand-the-lead-scoring-tool): explicit criteria-based scores; applied as explained match tiers and completeness.
- [Zoho workflow rules](https://help.zoho.com/portal/en/kb/crm/automate-business-processes/workflows/articles/configuring-workflow-rules): conditions before actions; applied as automatic preparation plus manual assignment commit.
- [Salesforce duplicate rules](https://help.salesforce.com/s/articleView?id=duplicate_rules_standard_lead_rule.htm&language=en_US&type=0): duplicate detection and review; existing CRM duplicate warnings retained, repeated assignment protection strengthened.

Further backend work requires recovered service access: database uniqueness/idempotency, auditable scheduled follow-up tasks, notification-outbox retries/delivery receipts, and authenticated partner isolation tests. These are not marked implemented.

## Reproducible validation

Install pinned development dependencies with `npm ci`, then run `npm test`.

- Existing master workspace tests: pagination, escaped text, India-day work queues including Call Back, request coalescing, failed refresh preservation, staff dropdown and observer stability.
- Existing employee tests: authenticated simulated UI, safe text rendering, save payload, India time conversion, call comment and concurrency token.
- New `tests/automation-audit.cjs`: 23 scenario groups for matching, inference, preparation, history time bounds, search, selection, save outcomes and WhatsApp preparation.
- JavaScript syntax and `git diff --check` pass.

Synthetic API/DOM tests do not prove production permissions, successful writes, message delivery or full visual behavior. Final live acceptance must occur after deployment; the user retains the final Assign action.
