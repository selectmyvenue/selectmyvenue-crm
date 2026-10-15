const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const handler = fs.readFileSync(path.join(root, 'supabase/functions/meta-lead-webhook/index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261016010000_meta_lead_webhook_idempotency.sql'), 'utf8');
const fieldMap = JSON.parse(fs.readFileSync(path.join(root, 'supabase/functions/meta-lead-webhook/field-map.example.json'), 'utf8'));

assert.match(handler, /x-hub-signature-256/);
assert.match(handler, /MAX_BODY_BYTES/);
assert.match(handler, /supabase\.rpc\(\s*"insert_meta_lead_enquiry"/);
assert.match(handler, /Skipped Meta lead with missing required contact fields/);
assert.match(handler, /Meta lead retrieval failed", \{ leadId: leadgenId, status: leadResponse\.status \}/);
assert.doesNotMatch(handler, /console\.error\([^\n]*(?:\brow\b|leadJson|rawBody|insertError)/);
assert.doesNotMatch(handler, /\.from\("customer_enquiries"\)\s*\.select\("id"\)/);

assert.match(migration, /create table if not exists public\.meta_lead_webhook_events/);
assert.match(migration, /meta_lead_id text primary key/);
assert.match(migration, /on conflict \(meta_lead_id\) do nothing/);
assert.match(migration, /create or replace function public\.insert_meta_lead_enquiry/);
assert.match(migration, /insert into public\.customer_enquiries/);
assert.match(migration, /revoke all on function public\.insert_meta_lead_enquiry\(text, jsonb\) from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.insert_meta_lead_enquiry\(text, jsonb\) to service_role/);
assert.doesNotMatch(migration, /alter table public\.customer_enquiries\s+add column/i);

assert.match(fieldMap.event_timing, /requirements/i);
assert.doesNotMatch(fieldMap.event_timing, /^event_date$/);
assert.match(fieldMap.guest_count, /numeric/i);

console.log('PASS Meta webhook static contract: signature guard, bounded payload, atomic idempotency migration, service-role-only RPC, no customer_enquiries schema extension, PII-safe logging rules and accurate field map.');
