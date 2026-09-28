/**
 * Verifies that a production build contains everything needed for the
 * installable PWA and the Android Trusted Web Activity wrapper.
 *
 * Usage: node scripts/verify-pwa.mjs [distDir]
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const distDir = process.argv[2] ?? 'dist';
const failures = [];

function requireFile(relativePath) {
  const absolute = path.join(distDir, relativePath);
  if (!existsSync(absolute)) {
    failures.push(`missing build output: ${absolute}`);
    return null;
  }
  return absolute;
}

function checkManifest() {
  const file = requireFile('manifest.webmanifest');
  if (!file) return;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`manifest.webmanifest is not valid JSON: ${error.message}`);
    return;
  }

  const required = ['name', 'short_name', 'start_url', 'display', 'orientation', 'theme_color', 'background_color', 'icons'];
  for (const key of required) {
    if (!manifest[key]) failures.push(`manifest is missing "${key}"`);
  }

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const sizes = icons.map((icon) => icon.sizes);
  for (const size of ['192x192', '512x512']) {
    if (!sizes.includes(size)) failures.push(`manifest needs a ${size} icon`);
  }
  if (!icons.some((icon) => String(icon.purpose ?? '').includes('maskable'))) {
    failures.push('manifest needs a maskable icon');
  }
  if (!icons.some((icon) => String(icon.purpose ?? '').includes('any'))) {
    failures.push('manifest needs an icon with purpose "any"');
  }
}

function checkAssetLinks() {
  const file = requireFile('.well-known/assetlinks.json');
  if (!file) return;
  let links;
  try {
    links = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`assetlinks.json is not valid JSON: ${error.message}`);
    return;
  }
  const target = Array.isArray(links) ? links[0]?.target : undefined;
  if (!target?.package_name) failures.push('assetlinks.json is missing target.package_name');
  if (!Array.isArray(target?.sha256_cert_fingerprints) || target.sha256_cert_fingerprints.length === 0) {
    failures.push('assetlinks.json is missing target.sha256_cert_fingerprints');
  }

  // A placeholder fingerprint silently breaks TWA verification, so catch it here.
  const sha256 = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i;
  for (const fingerprint of target?.sha256_cert_fingerprints ?? []) {
    const value = String(fingerprint);
    if (/replace|placeholder|your_|xxx/i.test(value)) {
      failures.push('assetlinks.json still contains a placeholder fingerprint');
    } else if (!sha256.test(value)) {
      failures.push(`assetlinks.json has a malformed SHA-256 fingerprint: ${value}`);
    }
  }
}

function checkServiceWorker() {
  const file = requireFile('sw.js');
  if (!file) return;
  const source = readFileSync(file, 'utf8');
  if (!source.includes('offline.html')) {
    failures.push('service worker does not reference the offline fallback page');
  }
}

requireFile('index.html');
requireFile('offline.html');
checkManifest();
checkAssetLinks();
checkServiceWorker();

if (failures.length > 0) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  process.exit(1);
}

console.log(`✓ ${distDir} contains the required PWA and TWA artifacts`);
