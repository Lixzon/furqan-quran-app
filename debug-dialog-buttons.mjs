import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: /recite|find/i }).click();
await page.getByLabel('Recognised Arabic text').fill('Allahu la ilaha illa Huwa');
await page.waitForTimeout(4000);

const dialogButtons = await page.locator('[role="dialog"] button').evaluateAll((buttons) =>
  buttons.map((b) => ({
    text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    aria: b.getAttribute('aria-label') || '',
    className: b.className,
  })),
);
console.log(JSON.stringify(dialogButtons, null, 2));

await browser.close();
