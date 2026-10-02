import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: /recite|find/i }).click();
await page.getByLabel('Recognised Arabic text').fill('Allahu la ilaha illa Huwa');
await page.waitForTimeout(4000);

const dialogs = await page.locator('[role="dialog"]').evaluateAll((nodes) =>
  nodes.map((n) => ({
    text: n.innerText.slice(0, 220),
    className: n.className,
    buttons: n.querySelectorAll('button').length,
  })),
);
console.log('DIALOGS', JSON.stringify(dialogs, null, 2));
console.log('MATCH TEXT COUNT', await page.getByText(/Matches found|possible matches|closest matches|No matching/i).count());
console.log('PAGE TITLE', await page.title());
await browser.close();
