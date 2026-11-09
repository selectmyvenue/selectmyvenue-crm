import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const env = process.env;
const required = [
  'PARTNER_A_EMAIL','PARTNER_A_PASSWORD','PARTNER_A_OWN_VENUE','PARTNER_A_FORBIDDEN_VENUE',
  'PARTNER_B_EMAIL','PARTNER_B_PASSWORD','PARTNER_B_OWN_VENUE','PARTNER_B_FORBIDDEN_VENUE',
];
const missing = required.filter(k => !env[k]);
if (missing.length) {
  console.error('Missing GitHub Actions secrets: ' + missing.join(', '));
  console.error('Configure the SMV_TEST_PARTNER_A_* and SMV_TEST_PARTNER_B_* repository secrets, then run this workflow manually.');
  process.exit(2);
}
const loginUrl = env.PARTNER_LOGIN_URL || 'https://partner.selectmyvenue.com/login.html';
const dashboardUrl = env.PARTNER_DASHBOARD_URL || 'https://partner.selectmyvenue.com/dashboard.html';
const browser = await chromium.launch({ headless: true });
const errors = [];
async function testPartner(label, email, password, ownVenue, forbiddenVenue) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  try {
    const response = await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    assert(response && response.status() < 400, label + ': login page HTTP error');
    const emailField = page.locator('input[type="email"], input[name*="email" i], input[autocomplete="username"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    await emailField.waitFor({ state: 'visible', timeout: 20000 });
    await emailField.fill(email);
    await passwordField.fill(password);
    const submit = page.locator('button[type="submit"], input[type="submit"]').first();
    await submit.click();
    await page.waitForURL(url => /dashboard|index|home/i.test(url.pathname), { timeout: 45000 }).catch(async () => {
      await page.waitForTimeout(5000);
    });
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);
    const body = (await page.locator('body').innerText()).toLowerCase();
    assert(!/sign in|invalid login|incorrect password|login required/i.test(body), label + ': login did not reach authenticated partner workspace');
    assert(body.includes(ownVenue.toLowerCase()), label + ': own venue label not visible in partner workspace');
    assert(!body.includes(forbiddenVenue.toLowerCase()), label + ': other partner venue label leaked into workspace');
    assert.deepEqual(pageErrors, [], label + ': browser JavaScript errors: ' + pageErrors.join('; '));
    console.log('PASS ' + label + ': authenticated workspace reached; own venue visible; other partner venue absent.');
  } catch (e) {
    errors.push(label + ': ' + e.message);
    console.error('FAIL ' + label + ': ' + e.message);
  } finally {
    await context.close();
  }
}
try {
  await testPartner('Partner A', env.PARTNER_A_EMAIL, env.PARTNER_A_PASSWORD, env.PARTNER_A_OWN_VENUE, env.PARTNER_A_FORBIDDEN_VENUE);
  await testPartner('Partner B', env.PARTNER_B_EMAIL, env.PARTNER_B_PASSWORD, env.PARTNER_B_OWN_VENUE, env.PARTNER_B_FORBIDDEN_VENUE);
} finally {
  await browser.close();
}
if (errors.length) process.exit(1);
console.log('PASS both partner isolation browser checks.');
