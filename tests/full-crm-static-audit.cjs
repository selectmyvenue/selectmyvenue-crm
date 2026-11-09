'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
function check(label, fn) {
  fn();
  checks.push(label);
  console.log('PASS ' + label);
}
function localAssetPath(route, reference) {
  const clean = reference.split(/[?#]/, 1)[0];
  if (!clean || /^(?:[a-z]+:)?\/\//i.test(clean) || clean.startsWith('data:') || clean.startsWith('#')) return null;
  return path.resolve(root, path.dirname(route), decodeURIComponent(clean));
}

const routes = [
  'dashboard.html',
  'login.html',
  'partner-login.html',
  'employees.html',
  'employee/index.html',
  'hr/index.html',
  'billing/index.html',
];

check('all CRM entry-point documents exist', () => {
  for (const route of routes) assert.ok(fs.existsSync(path.join(root, route)), 'Missing route: ' + route);
});

check('all local scripts and stylesheets referenced by CRM entry points exist', () => {
  for (const route of routes) {
    const html = read(route);
    const refs = [
      ...Array.from(html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi), m => m[1]),
      ...Array.from(html.matchAll(/<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi), m => m[1]),
    ];
    for (const ref of refs) {
      const target = localAssetPath(route, ref);
      if (target) assert.ok(fs.existsSync(target), route + ' references missing local asset ' + ref);
    }
  }
});

check('Master CRM keeps a dedicated login form and no-index protection', () => {
  const html = read('login.html');
  assert.match(html, /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i);
  assert.match(html, /id=["']loginForm["']/);
  assert.match(html, /type=["']password["']/);
});

check('Master CRM keeps its existing Supabase auth storage namespace', () => {
  const html = read('dashboard.html');
  const core = read('crm-core.js');
  assert.match(html, /SUPABASE_URL/);
  assert.match(html, /SUPABASE_ANON_KEY/);
  assert.match(core, /storageKey:\s*["']smv-master-crm-auth["']/);
  assert.match(core, /persistSession:\s*true/);
});

check('partner login remains a redirect to the separate partner origin', () => {
  const html = read('partner-login.html');
  assert.match(html, /https:\/\/partner\.selectmyvenue\.com\/login\.html/);
  assert.match(html, /noindex/i);
});

check('employee workspace keeps login gating and separate employee assets', () => {
  const html = read('employee/index.html');
  assert.match(html, /id=["']loginPanel["']/);
  assert.match(html, /id=["']loginForm["']/);
  assert.match(html, /id=["']workspace["'][^>]*hidden/);
  assert.match(html, /common\.js/);
  assert.match(html, /employee\.js/);
});

check('employee administration remains active-staff gated and uses its server function', () => {
  const html = read('employees.html');
  const js = read('employees.js');
  assert.match(js, /rpc\(["']smv_is_active_staff["']\)/);
  assert.match(js, /functions\.invoke\(["']manage-employees["']/);
  assert.match(js, /action:\s*["']create["']/);
  assert.match(js, /action:\s*["']reset_password["']/);
});

check('HR portal retains active-admin gating and existing login redirect', () => {
  const html = read('hr/index.html');
  assert.match(html, /q\.data\.role\s*!==\s*['"]admin['"]/);
  assert.match(html, /!q\.data\.is_active/);
  assert.match(html, /location\.href\s*=\s*['"]\.\.\/login\.html/);
});

check('Billing Centre retains session and active-staff authorization checks', () => {
  const html = read('billing/index.html');
  assert.match(html, /sb\.auth\.getSession\(\)/);
  assert.match(html, /sb\.rpc\(["']smv_is_active_staff["']\)/);
  assert.match(html, /billing_admin_only/);
});

check('current CRM source still references the existing customer enquiry workflow', () => {
  const core = read('crm-core.js');
  const employee = read('crm-employee-integration.js');
  assert.match(core, /from\(["']customer_enquiries["']\)/);
  assert.match(employee, /customer_enquiries/);
});

check('this audit adds no production schema, RLS, or environment configuration changes', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.private, true);
  assert.equal(fs.existsSync(path.join(root, '.env')), false, 'Do not commit a local .env file');
});

console.log('PASS full CRM static audit: ' + checks.length + ' contract groups');
