const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: /recite|find/i }).click();
  await page.getByLabel('Recognised Arabic text').fill('Allahu la ilaha illa Huwa');
  await page.waitForTimeout(4000);
  console.log('COUNTS');
  console.log('matches text', await page.getByText(/Matches found|possible matches/i).count());
  console.log('body text start');
  console.log((await page.locator('body').innerText()).slice(0, 2500));
  console.log('body text end');
  await browser.close();
})();
