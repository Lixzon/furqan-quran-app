import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: /recite|find/i }).click();
await page.getByLabel('Recognised Arabic text').fill('Allahu la ilaha illa Huwa');
await page.waitForTimeout(4000);

const btn = page.getByRole('button', { name: /al-imran|surah/i }).first();
console.log('VISIBLE?', await btn.isVisible());
console.log('ENABLED?', await btn.isEnabled());
try {
  await btn.click({ timeout: 10000 });
  console.log('CLICK SUCCEEDED');
  console.log('URL', page.url());
} catch (error) {
  console.log('CLICK FAILED');
  console.log(error.message);
  const rect = await btn.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height, visible: !!(r.width || r.height) };
  });
  console.log('RECT', JSON.stringify(rect));
}
await browser.close();
