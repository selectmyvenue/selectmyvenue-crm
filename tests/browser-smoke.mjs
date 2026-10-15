import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const base = (process.env.SMV_CRM_BASE_URL || 'https://crm.selectmyvenue.com').replace(/\/$/, '');
const routes = [
  { path: '/login.html', title: /Select My Venue CRM/i, selector: '#loginForm' },
  { path: '/partner-login.html', title: /Select My Venue/i, selector: 'form' },
  { path: '/employee/', title: /Employee CRM/i, selector: '#loginForm' },
];

const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  for (const route of routes) {
    for (const viewport of [
      { name: 'mobile-android', ...devices['Pixel 7'] },
      { name: 'desktop', viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 },
    ]) {
      const context = await browser.newContext({
        viewport: viewport.viewport,
        deviceScaleFactor: viewport.deviceScaleFactor || 1,
        isMobile: Boolean(viewport.isMobile),
        hasTouch: Boolean(viewport.hasTouch),
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      try {
        const response = await page.goto(base + route.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        assert(response && response.status() < 400, `HTTP status for ${route.path}: ${response?.status()}`);
        await page.locator(route.selector).first().waitFor({ state: 'visible', timeout: 20000 });
        if (route.title) assert.match(await page.title(), route.title, `unexpected title at ${route.path}`);
        const overflow = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));
        assert(
          overflow.page <= overflow.viewport + 2 && overflow.body <= overflow.viewport + 2,
          `horizontal overflow at ${route.path} (${viewport.name}): ${JSON.stringify(overflow)}`,
        );
        assert.deepEqual(pageErrors, [], `JavaScript runtime errors at ${route.path}: ${pageErrors.join('; ')}`);
        console.log(`PASS ${route.path} ${viewport.name}`);
      } catch (error) {
        failures.push(`${route.path} ${viewport.name}: ${error.message}`);
        console.error(`FAIL ${route.path} ${viewport.name}: ${error.message}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
