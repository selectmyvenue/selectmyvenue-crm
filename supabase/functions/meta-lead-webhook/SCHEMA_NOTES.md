Target table: `customer_enquiries`. The webhook writes only existing fields:
- customer_name
- mobile
- email (optional)
- location
- occasion
- guests (only when numeric)
- requirements
- source = Meta Ads - Instant Form
- status = new

Event timing answers such as "Within 30 days" belong in `requirements`, not `event_date`, unless Meta supplies an exact date that is parsed and validated separately.

Atomic deduplication is handled by the separate `meta_lead_webhook_events` table and the `insert_meta_lead_enquiry(text, jsonb)` database function. Do not add Meta-specific columns to `customer_enquiries`. The migration is proposed and must be reviewed and tested in a non-production project before any production application.
