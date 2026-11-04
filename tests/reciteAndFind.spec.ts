import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      public lang = 'ar-SA';
      public continuous = false;
      public interimResults = true;
      public maxAlternatives = 1;
      public onstart: (() => void) | null = null;
      public onresult: ((event: any) => void) | null = null;
      public onerror: ((event: any) => void) | null = null;
      public onend: (() => void) | null = null;

      start() {
        if (this.onstart) this.onstart();
        const transcript = this.lang === 'en-US' ? 'Indeed with hardship comes ease' : 'Allahu la ilaha illa Huwa';
        const event = {
          resultIndex: 0,
          results: [{ 0: { transcript }, isFinal: true, length: 1 }],
        };
        setTimeout(() => {
          if (this.onresult) this.onresult(event as any);
          if (this.onend) this.onend();
        }, 25);
      }

      stop() {
        if (this.onend) this.onend();
      }

      abort() {
        if (this.onend) this.onend();
      }
    }

    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
  });
});

test('Recite & Find shows surah details in each match and opens the selected ayah', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  await page.getByRole('button', { name: /search by reciting a verse/i }).click();
  await page.getByLabel('Recognised Arabic text').fill('Allahu la ilaha illa Huwa');
  await page.getByText(/closest matches|No matching/i).waitFor({ timeout: 3000 }).catch(() => undefined);

  await expect(page.getByText(/Matches found|possible matches/i)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/Surah \d+ · .+ · Ayah \d+/).first()).toBeVisible();
  await page.getByRole('button', { name: /al-imran|surah/i }).first().click();
  await expect(page).toHaveURL(/\/surah\/\d+\?ayah=/);
  await expect(page.getByRole('button', { name: /Back to Matches/i })).toHaveCount(0);
});

test('English recitation search does not reopen the match drawer after selecting a result', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  await page.getByRole('button', { name: /search by reciting a verse/i }).click();
  await page.getByRole('button', { name: /english/i }).click();
  await page.getByLabel('Recognised Arabic text').fill('Indeed with hardship comes ease');

  await expect(page.getByText(/matches found|possible matches/i)).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /surah.*:\d+/i }).first().click();
  await expect(page).toHaveURL(/\/surah\/\d+\?ayah=/);
  await expect(page.getByRole('button', { name: /Back to Matches/i })).toHaveCount(0);
});

test('daily reading prompt stays dismissed after starting a surah', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  await page.getByText('Have you read your Qur’an today?').waitFor();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/\/surah\/\d+/);
  await page.goBack();

  await expect(page.getByText('Have you read your Qur’an today?')).toHaveCount(0);
});
