import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const iconDirectory = join(publicDirectory, 'icons');
const logo = join(publicDirectory, 'manara-logo.svg');

await mkdir(iconDirectory, { recursive: true });

for (const size of [192, 512]) {
  const output = join(iconDirectory, `manara-${size}.png`);
  await sharp(logo).resize(size, size).png().toFile(output);
  await sharp(logo).resize(size, size).png().toFile(join(iconDirectory, `manara-maskable-${size}.png`));
}

await sharp(logo).resize(180, 180).png().toFile(join(iconDirectory, 'manara-apple-touch-icon.png'));
