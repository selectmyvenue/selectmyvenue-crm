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
  check(html.includes('@page{size:A4 portrait;margin:12mm 13mm 25mm}') && html.includes('.letter-footer{display:block;height:13mm;margin:0;position:fixed;') && html.includes('.company-signoff{margin-top:14px;page-break-inside:avoid;break-inside:avoid}') && !html.includes('DRAFT — REVIEW BEFORE ISSUE</div><div class="letter-date">'), 'prints letters with reserved page margins, repeating fixed footer and professional unbroken signature block');
  check(html.includes('letter-footer') && html.includes('aria-label="End of Select My Venue letter"'), 'adds a matching teal-and-gold finishing footer to every HR letter');
  check(html.includes('https://unpkg.com/@supabase/supabase-js@2') && html.includes('Secure HR connection library is unavailable'), 'HR portal has a fallback CDN and visible recovery if the auth library fails to load');
  check(!html.includes("content:''") && html.includes('.letter-footer:before{content:""') && html.includes('.letter-footer:after{content:""'), 'branded footer CSS does not break the shared HR page JavaScript parser');
  check(html.includes('Mr./Ms. ') && html.includes('[Enter candidate postal address here]') && html.includes('Subject: '), 'all HR letters receive the standard dated recipient, editable address, subject and salutation opening');
  check(html.includes('<h2 class="numbered-heading">') && html.includes('Please sign and return the duplicate copy of this Job Offer Letter') && html.includes('support@selectmyvenue.com') && html.includes('We look forward to welcoming you aboard.') && html.includes('Sincerely,</p>'), 'numbered section headings are bold and offer letters end with support-email acceptance and classic sign-off');
  check(!html.includes('06f6db26-66f5-4dcb-b2f2-6cdc9eac0377.png') && html.includes('<strong>Raj Kumar</strong><br>Sole Proprietor'), 'all HR letters use text-only Raj Kumar / Sole Proprietor sign-off without a signature image');
  check(html.includes('letter-footer') && html.includes('smv-master-letterhead'), 'all HR letters share the master header and branded footer');

  check(html.includes('letter-field-line') && html.includes('field=line.match') && html.includes('10\\.\\s*ACCEPTANCE AND SIGNATURES'), 'final HR letter formatter preserves label/value rows and the full acceptance section');

  check(html.includes('id="recipientAddress"') && html.includes("const address=String($(\'recipientAddress\')?.value") && html.includes("Enter the recipient’s complete postal address above"), 'formal HR letters collect an explicit full postal address before generation');
  check(html.includes('font-size:12pt') && html.includes('border-left:4px solid #c99b45') && html.includes('color:#087d70'), 'section headings and field labels have a distinct visual colour and size hierarchy');
  const formatterStart = html.indexOf('function formatHrLetterBody(raw){');
  const formatterEnd = html.indexOf("$('print').onclick=", formatterStart);
  check(formatterStart >= 0 && formatterEnd > formatterStart, 'final HR letter formatter is available for regression testing');
  const formatterSource = html.slice(formatterStart, formatterEnd);
  const formatterDom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  formatterDom.window.docDraft = { document_type: 'offer_letter' };
  formatterDom.window.esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  formatterDom.window.eval(formatterSource + '\nwindow.__formatHrLetterBody = formatHrLetterBody;');
  const sampleOffer = [
    '14 November 2026', '', 'To,', 'Mr. Amar Satya Mehta', 'H.No. G-66, Lajpat Nagar II,', 'South East Delhi, Delhi 110024', '',
    'Subject: Offer Letter for the position of Venue Listing Executive at Select My Venue', '',
    'Dear Amar,', '',
    '1. COMPANY DETAILS',
    'Enterprise Name: Select My Venue',
    'Business Constitution: Proprietorship',
    'GSTIN: 07BTAPK8541A1Z1', '',
    '2. ROLE AND COMMENCEMENT',
    'Role: Venue Listing Executive',
    'Proposed Commencement Date: 2026-11-15',
    'Work Arrangement: Fully remote with flexible working hours subject to agreed deliverables.',
    'Reporting / Coordination: Coordinate with the Company’s designated contact for assignments.', '',
    '10. ACCEPTANCE AND SIGNATURES',
    'By signing below, both parties confirm that they have read and understood the terms.',
    'For Select My Venue',
    'Name: Raj Kumar',
    'Designation: Sole Proprietor',
    'Date: 2026-11-14', '',
    'ACCEPTANCE BY EXECUTIVE',
    'I, Amar Satya Mehta, confirm my acceptance of this engagement.',
    'Signature: ________________________________________',
    'Name: Amar Satya Mehta',
    'Date: __________________'
  ].join('\n');
  const renderedOffer = formatterDom.window.__formatHrLetterBody(sampleOffer);
  check(renderedOffer.includes('<p class="letter-field-line"><strong>Enterprise Name:</strong> Select My Venue</p>'), 'offer letter keeps Enterprise Name on its own line');
  check(renderedOffer.includes('<p class="letter-field-line"><strong>Business Constitution:</strong> Proprietorship</p>'), 'offer letter keeps Business Constitution on its own line');
  check(renderedOffer.includes('<p class="letter-field-line"><strong>Proposed Commencement Date:</strong> 2026-11-15</p>') && renderedOffer.includes('<p class="letter-field-line"><strong>Reporting / Coordination:</strong>'), 'role and commencement details remain separate labelled lines');
  check(renderedOffer.includes('<h2 class="numbered-heading">10. ACCEPTANCE AND SIGNATURES</h2>') && renderedOffer.includes('ACCEPTANCE BY EXECUTIVE') && renderedOffer.includes('Signature:'), 'offer letter preserves company and candidate acceptance/signature sections');
  check(renderedOffer.includes('H.No. G-66, Lajpat Nagar II,<br>South East Delhi, Delhi 110024'), 'recipient address is preserved in full across multiple address lines');
  check(renderedOffer.includes('<h2 class="numbered-heading">1. COMPANY DETAILS</h2>') && renderedOffer.includes('<h2 class="numbered-heading">2. ROLE AND COMMENCEMENT</h2>'), 'main numbered section headings render as distinct section headings');
  check(!renderedOffer.includes('Select My Venue Business Constitution') && !renderedOffer.includes('Please sign and return the duplicate copy'), 'offer letter does not collapse adjacent fields or duplicate a generic acceptance paragraph');
  formatterDom.window.close();
  console.log('HR portal static checks passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
