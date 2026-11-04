import { test, expect } from '@playwright/test';

test('mobile reader keeps the complete playback panel within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('http://localhost:5173/surah/1');

  await expect(page.getByRole('button', { name: 'Play recitation' })).toBeVisible({ timeout: 10000 });
  for (const label of [
    'Go to beginning or previous chapter',
    'Previous ayah',
    'Play recitation',
    'Next ayah',
    'Go to end or next chapter',
    'Playback settings',
  ]) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
  await expect(page.locator('.reader-hud-grid > button')).toHaveCount(6);

  const panel = await page.locator('.reader-hud-grid').boundingBox();
  expect(panel).not.toBeNull();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(360);
});

test('reader controls jump to chapter boundaries and neighboring chapters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/surah/2?ayah=120');

  await expect(page.getByRole('button', { name: 'Go to beginning or previous chapter' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Go to beginning or previous chapter' }).click();
  await expect(page).toHaveURL(/\/surah\/2/);
  await page.getByRole('button', { name: 'Go to beginning or previous chapter' }).click();
  await expect(page).toHaveURL(/\/surah\/1\?ayah=7/);

  await page.goto('http://localhost:5173/surah/1?ayah=1');
  await page.getByRole('button', { name: 'Go to end or next chapter' }).click();
  await expect(page).toHaveURL(/\/surah\/1/);
  await page.getByRole('button', { name: 'Go to end or next chapter' }).click();
  await expect(page).toHaveURL(/\/surah\/2\?ayah=1/);
});

test('reader playback settings can jump directly to an ayah', async ({ page }) => {
  await page.goto('http://localhost:5173/surah/2');
  await page.getByRole('button', { name: 'Playback settings' }).click();
  await page.getByLabel(/Go to ayah/).fill('221');
  await page.getByRole('button', { name: 'Go', exact: true }).click();

  await expect(page).toHaveURL(/\/surah\/2\?ayah=221/);
});

test('ayah actions can mark a verse memorized and show it in Library', async ({ page }) => {
  await page.goto('http://localhost:5173/surah/1');
  await page.locator('.ayah-row').first().click();

  const markButton = page.getByRole('button', { name: 'Mark as memorized' });
  await expect(markButton).toBeVisible();
  await markButton.click();
  await expect(page.getByRole('button', { name: 'Memorized' })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('http://localhost:5173/library?section=memorized');
  await expect(page.getByText(/Surah 1 · .* · Ayah 1/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Memorized' })).toHaveAttribute('aria-pressed', 'true');
});
