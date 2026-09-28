/**
 * Colour maths for the reader-built accent (365-day milestone).
 *
 * The stock accents are hand-tuned pairs in `index.css`. A custom accent is a
 * single colour the reader picks, so the "strong" variant used for pressed
 * states and the foreground that sits on an accent fill both have to be
 * derived. Everything here is pure and dependency-free so it can be unit
 * checked by eye and reused by `ThemeManager`.
 */

export interface CustomAccentVars {
  /** `--q-accent` */
  accent: string;
  /** `--q-accent-strong` */
  strong: string;
  /** `--q-on-accent`: readable text on top of the accent fill. */
  on: string;
}

/** Accepts `#rgb` / `#rrggbb` and returns lowercase `#rrggbb`, else null. */
export function normalizeHex(value: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const digits = match[1].toLowerCase();
  const full = digits.length === 3 ? digits.replace(/./g, (char) => char + char) : digits;
  return `#${full}`;
}

function channels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  const part = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = channels(hex);
  return toHex([
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount,
  ]);
}

function relativeLuminance(hex: string): number {
  const linear = channels(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Dark ink for bright accents, white for dark ones — whichever reads better. */
export function readableOnAccent(hex: string): string {
  const darkInk = '#08130f';
  return contrast(hex, '#ffffff') >= contrast(hex, darkInk) ? '#ffffff' : darkInk;
}

/**
 * The three CSS custom properties for a custom accent, or null when the value
 * is not a usable colour. Very dark accents are lightened rather than
 * darkened, so the "strong" variant stays visible on a dark surface.
 */
export function customAccentVars(value: string): CustomAccentVars | null {
  const accent = normalizeHex(value);
  if (!accent) return null;
  const dark = relativeLuminance(accent) < 0.18;
  const strong = mix(accent, dark ? [255, 255, 255] : [0, 0, 0], 0.18);
  return { accent, strong, on: readableOnAccent(accent) };
}
