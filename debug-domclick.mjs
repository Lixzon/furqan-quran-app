import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: /recite|find/i }).click();
await page.getByLabel('Recognised Arabic text').fill('Allahu la ilaha illa Huwa');
await page.waitForTimeout(4000);

const buttons = await page.locator('button').evaluateAll((buttons) => buttons.map((el) => ({
  text: el.innerText.slice(0, 120),
  textContent: el.textContent?.slice(0, 120),
  disabled: el.disabled,
  ariaLabel: el.getAttribute('aria-label'),
  className: el.className,
}))); 
console.log(JSON.stringify(buttons.slice(0, 40), null, 2));

const all = await page.locator('button').all();
for (const [idx, btn] of all.entries()) {
  const text = await btn.innerText();
  if (/al-imran|surah/i.test(text)) {
    console.log('FOUND MATCH BUTTON INDEX', idx, text.slice(0, 200));
    try {
      await btn.evaluate((el) => el.click());
      console.log('DOM CLICK WORKED', page.url());
      break;
    } catch (error) {
      console.log('DOM CLICK ERROR', error.message);
    }
  }
}
await browser.close();
