const { JSDOM } = require('jsdom');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'hr', 'index.html'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261029_hr_portal.sql'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'dashboard.html'), 'utf8');

function check(condition, message) {
  assert.ok(condition, message);
  console.log('PASS ' + message);
}

async function run() {
  check(html.includes('https://selectmyvenue.com/logo.png'), 'uses original Select My Venue logo');
  check(html.includes('peopleSearch') && html.includes('statusFilter'), 'includes people search and stage filter');
  check(html.includes('exportPeople') && html.includes('text/csv'), 'includes filtered CSV export');
  check(html.includes('hr_activity_log') && html.includes('async function audit'), 'records HR activity events');
  check(html.includes("q.data.role!=='admin'") && html.includes("!q.data.is_active"), 'requires active admin access');
  check(html.includes("location.href='../login.html'"), 'redirects unauthenticated users to existing login');
  check(dashboard.includes('HR Portal') && dashboard.includes('target="_blank"'), 'Master CRM links to HR portal in a new tab');
  check(migration.includes('alter table public.hr_people enable row level security'), 'enables RLS on HR people');
  check(migration.includes('alter table public.hr_documents enable row level security'), 'enables RLS on HR documents');
  check(migration.includes('alter table public.hr_onboarding_tasks enable row level security'), 'enables RLS on onboarding tasks');
  check(migration.includes("s.role='admin' and s.is_active=true"), 'RLS limits HR records to active admins');
  check(!/alter\\s+table\\s+public\\.customer_enquiries/i.test(migration), 'does not alter customer_enquiries');
  check(!/alter\\s+policy|drop\\s+policy.*customer_enquiries/i.test(migration), 'does not change customer_enquiries policies');
  check(migration.includes('drop policy if exists'), 'HR policies can be recreated during a controlled rerun');
  check(html.includes('DRAFT — REVIEW BEFORE ISSUE') && html.includes('not a final issued agreement'), 'document generator marks letters as drafts');
  check(html.includes('applicable law') && html.includes('No commission rate is pre-filled or assumed.'), 'does not invent commission terms');
  console.log('HR portal static checks passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
