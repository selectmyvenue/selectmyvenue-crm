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
  check(!/alter\s+table\s+public\.customer_enquiries/i.test(migration), 'does not alter customer_enquiries');
  check(!/alter\s+policy|drop\s+policy.*customer_enquiries/i.test(migration), 'does not change customer_enquiries policies');
  check(migration.includes('drop policy if exists'), 'HR policies can be recreated during a controlled rerun');
  check(html.includes('DRAFT — REVIEW BEFORE ISSUE') && html.includes('not a final issued agreement'), 'document generator marks letters as drafts');
  check(html.includes('applicable law') && html.includes('No commission rate is pre-filled or assumed.'), 'does not invent commission terms');
  check(html.includes('<option value="sales_terms">Sales Executive — Terms &amp; Conditions / Business Protection Agreement</option>'), 'sales protection agreement is available in document generator');
  check(html.includes('<option value="sales_terms">Sales Executive — Terms &amp; Conditions / Business Protection Agreement</option>') && html.includes('id="uploadType"'), 'sales protection agreement is available in signed-document upload selector');
  check(html.includes('id="requiredDocSlots"') && html.includes("type:'sales_terms',label:'Signed Sales Terms & Business Protection Agreement'"), 'sales roles receive a named mandatory signed-document upload slot');
  check(html.includes("d.status==='signed'&&d.file_path") && html.includes('Cannot activate yet. Upload signed mandatory documents first:'), 'activation is blocked until required signed files are uploaded');
  check(html.includes('smv-master-letterhead') && html.includes('https://d2ol7oe51mr4n9.cloudfront.net/user_3Ih9wnQzG3XZOicOIhWaLzWTJcg/96be40c4-8d42-4c7f-89e6-23727891099a.png'), 'all generated HR letters use the exact approved master letterhead image');
  check(html.includes('@page{size:A4 portrait;margin:12mm 13mm 25mm}') && html.includes('.letter-footer{display:block;height:13mm;margin:0;position:fixed;') && html.includes('.authorised-signature{display:block;width:100%;max-width:72mm;') && !html.includes('DRAFT — REVIEW BEFORE ISSUE</div><div class="letter-date">'), 'prints letters with reserved page margins, repeating fixed footer and professional unbroken signature block');
  check(html.includes('letter-footer') && html.includes('aria-label="End of Select My Venue letter"'), 'adds a matching teal-and-gold finishing footer to every HR letter');
  check(html.includes('https://unpkg.com/@supabase/supabase-js@2') && html.includes('Secure HR connection library is unavailable'), 'HR portal has a fallback CDN and visible recovery if the auth library fails to load');
  check(!html.includes("content:''") && html.includes('.letter-footer:before{content:""') && html.includes('.letter-footer:after{content:""'), 'branded footer CSS does not break the shared HR page JavaScript parser');
  check(html.includes('Mr./Ms. ') && html.includes('[Enter candidate postal address here]') && html.includes('Subject: '), 'all HR letters receive the standard dated recipient, editable address, subject and salutation opening');
  check(html.includes('https://d2ol7oe51mr4n9.cloudfront.net/user_3Ih9wnQzG3XZOicOIhWaLzWTJcg/06f6db26-66f5-4dcb-b2f2-6cdc9eac0377.png') && html.includes('authorised-signature') && html.includes('Date: \'+signDate+\''), 'all HR letters include the cleaned original Raj Kumar signature and generation date');
  check(html.includes('letter-footer') && html.includes('smv-master-letterhead'), 'all HR letters share the master header and branded footer');
  console.log('HR portal static checks passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
