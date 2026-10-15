Direct Meta Instant Form lead delivery to the Select My Venue CRM.

## Current status
Draft only. Do not deploy this function or apply its migration to production until the checks below pass in a non-production Supabase project and a Meta test lead.

## Safety design
- Meta POST requests are verified with `x-hub-signature-256` using the raw request body.
- Customer contact details and raw Graph API response bodies must never be written to application logs.
- The function uses `insert_meta_lead_enquiry`, which claims a Meta lead ID and inserts the CRM enquiry in one database transaction.
- Idempotency lives in the separate `meta_lead_webhook_events` table; the existing `customer_enquiries` schema is not extended.
- The database function is executable only by `service_role`. The table has RLS enabled and no client-role access.
- Non-exact timing answers are stored in `requirements`, not `event_date`.
- Leads without a usable name or mobile are skipped and logged by Meta lead ID only.

## Required before production deployment
1. Review and apply the separate idempotency migration in a non-production Supabase project; verify the actual `customer_enquiries.id` type and column constraints before applying.
2. Configure `META_VERIFY_TOKEN`, `META_PAGE_ACCESS_TOKEN`, `META_APP_SECRET`, and Supabase environment secrets in the test project.
3. Subscribe the test Facebook Page to leadgen webhooks and verify GET challenge handling.
4. Test valid/invalid signatures, malformed JSON and page payloads, missing name/mobile, Graph API errors, insert errors, duplicate delivery, and concurrent replay.
5. Verify that a valid test lead appears once in the non-production CRM and that retrying the same Meta lead ID creates no second row.
6. Confirm sanitized logs contain no customer name, mobile, email, request body, access token, or mapped lead row.
7. Confirm the website enquiry flow, Master CRM, employee CRM, RLS, and plan names are unchanged.
8. Only after successful QA and explicit release approval should secrets, Page subscriptions, migration, and function be configured in production.
