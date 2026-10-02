import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: /recite|find/i }).click();
await page.getByLabel('Recognised Arabic text').fill('Allahu la ilaha illa Huwa');
await page.waitForTimeout(4000);
const matches = await page.getByRole('button', { name: /al-imran|surah/i }).evaluateAll((nodes) =>
  nodes.map((n) => ({
    text: (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180),
    aria: n.getAttribute('aria-label') || '',
    className: n.className,
  })),
);
console.log(JSON.stringify(matches, null, 2));
await browser.close();
