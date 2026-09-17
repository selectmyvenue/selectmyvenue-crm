# Master CRM review — 17 September 2026

## Shipped improvements

- Fixed conflicting website-source decorators that could trigger repeated DOM observer updates.
- Coalesced concurrent lead reads; kept the last successful lead table on network failure.
- Made optional venue capability and assignment/history reads independent of initial lead display.
- Added a 25-second HTTP request deadline. Writes are never automatically retried: after an uncertain network failure, refresh and verify the result before submitting again.
- Live updates wait while a lead, comment, inline field or venue form is being edited. Hidden/offline pages defer background refresh. Fallback reconciliation runs approximately every 90 seconds rather than rebuilding every 30 seconds.
- Added All, New, Today, Overdue, No follow-up and No employee assigned queues. Queue counts cover all loaded leads; search/status filters further narrow results. Today follows Asia/Kolkata. Today's already-due follow-ups also appear under Overdue. Completed/lost leads are excluded from work queues.
- Paginated rendering at 50 rows, while search, statistics and CSV continue to use the complete loaded dataset.
- Replaced employee UUID inputs with active staff names. Existing inactive owners remain preserved until deliberately changed. This is ownership, not a restriction on employee visibility; active employees still have access to all leads as requested.
- Added concurrency protection to office-note saves and prevented repeated clicks from submitting lead create/save twice.
- Improved narrow-screen filter stacking and retained horizontal table access rather than hiding columns. Approved logo assets and proportions remain unchanged.

## Review coverage

Reviewed the lead loaders, filters, inline/modal/comment updates, manual lead creation, Action Centre, duplicate detection, CSV export, follow-up queues, employee integration, venue loading/assignment/history paths and overlapping layout scripts. Read aggregate production counts and existing lead indexes; no customer data was modified for this release.

At review time: 36 leads, 15 venues, 7 venue assignments, 0 active employee accounts, and 29 open leads without a scheduled follow-up.

Automated checks cover pagination, escaping, India-day boundaries, closed-lead exclusion, request coalescing, slow venue isolation, failed refresh preservation, staff selection, existing-owner preservation, settling DOM observers, and the existing employee save/permission payload tests. These use a simulated DOM and API responses. Syntax and whitespace checks also passed.

The available browser session was signed out. Authenticated browser acceptance of every master/venue action, actual call delivery, payment paths and partner invitation delivery was not performed. No messages or invitations were sent. This is not a promise of zero downtime or a complete security audit.

## Existing features retained

Action Centre priorities, duplicate warnings, CSV export, quick follow-up controls, lead activity timeline, venue health checks, partner response tracking, lead/venue management, employee permissions, and Supabase realtime synchronization.

## Next priorities

1. Assign an owner and next follow-up to each open lead; create employee accounts when staff join.
2. Add scheduled reminder delivery only after choosing the channel and recipients. In-app work queues are available now; email/WhatsApp/SMS delivery is not configured by this release.
3. Add an auditable master-side activity record for every administrative edit, with team performance summaries. Employee updates already have server-side audit records.
4. Move master filtering/counts to server-side queries when lead volume grows significantly. This release limits rendered rows but still downloads all leads; some existing venue/history queries retain API row limits.
5. Consolidate legacy CSS/JavaScript overrides and introduce a dedicated staging environment, authenticated browser regression suite and monitoring.
6. Standardize all master date-entry controls on an explicit company timezone. New queues use India time; existing master datetime inputs still use the browser timezone.

## Verification

With Node and jsdom installed:

    node tests/master-workspace.cjs
    node tests/employee-ui.cjs

Rollback: revert this release commit. No database migration is required.
