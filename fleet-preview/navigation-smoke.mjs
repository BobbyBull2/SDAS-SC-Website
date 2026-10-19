import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.stack || error.message));
page.on('console', msg => {
  if (msg.type() === 'error') errors.push('console: ' + msg.text().slice(0, 350));
});
try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#nav [data-view]').first().waitFor({ timeout: 10000 });
  for (const tab of ['data','hangar','registry','pilots','home','data']) {
    await page.locator('#nav [data-view="' + tab + '"]').click();
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => {
      const el = document.querySelector('#app');
      if (!el) return { missing: true };
      const cs = getComputedStyle(el);
      return { text: el.innerText.slice(0, 280), markup: el.innerHTML.length, display: cs.display, visible: el.getBoundingClientRect().height, active: document.querySelector('#nav .active')?.getAttribute('data-view') };
    });
    console.log('NAV_TEST', tab, JSON.stringify(state));
    if (state.missing || state.active !== tab || !state.visible || state.markup < 50) {
      throw new Error('Navigation failed on ' + tab + ': ' + JSON.stringify(state));
    }
    if (tab === 'data' && !state.text.includes('BACKUP / RESTORE')) {
      throw new Error('Data Import view missing BACKUP / RESTORE: ' + JSON.stringify(state));
    }
  }
  console.log('BROWSER_ERRORS', JSON.stringify(errors.slice(0, 8)));
} catch(error) {
  console.log('BROWSER_ERRORS', JSON.stringify(errors.slice(0, 12)));
  throw error;
} finally {
  await browser.close();
}
