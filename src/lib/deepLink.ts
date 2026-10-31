/**
 * Deep-link parsing for Furqan.
 *
 * The native shell (and sibling apps such as Mishkah) hand us URLs such as
 * `furkan://verse/2/255`, `furkan://loop/2/255-260` or
 * `furkan://playlist/pl_123`. The browser build receives the same URLs through
 * the registered `web+furkan` protocol handler, which rewrites them into
 * `/?deep=<encoded url>`.
 *
 * Parsing is pure and total: anything unrecognised returns null so callers can
 * fall back to the landing page instead of routing somewhere broken.
 */

export const DEEP_LINK_SCHEME = 'furkan';
export const DEEP_LINK_PROTOCOL = 'web+furkan';
/** Query parameter used by the installed PWA protocol handler. */
export const DEEP_LINK_PARAM = 'deep';

export type DeepLinkAction =
  | { kind: 'navigate'; to: string }
  | { kind: 'loop'; surah: number; start: number; end: number };

export function verseDeepLink(surah: number, ayah?: number | null): string {
  const base = `${DEEP_LINK_SCHEME}://verse/${surah}`;
  return ayah && ayah > 0 ? `${base}/${ayah}` : base;
}

export function rangeDeepLink(surah: number, start: number, end: number): string {
  return `${DEEP_LINK_SCHEME}://loop/${surah}/${start}-${end}`;
}

export function playlistDeepLink(id: string): string {
  return `${DEEP_LINK_SCHEME}://playlist/${encodeURIComponent(id)}`;
}

function surahNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : null;
}

function ayahNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function surahPath(surah: number, ayah?: number | null): string {
  return ayah ? `/surah/${surah}?ayah=${ayah}` : `/surah/${surah}`;
}

/** Accepts `2/255`, `2:255`, `2` and `2:255-260`-style segment pairs. */
function parseCoordinates(segment: string): { surah: number; ayah: number | null } | null {
  const clean = decodeURIComponent(segment).replace(/^\/+|\/+$/g, '');
  if (!clean) return null;

  const range = clean.match(/^(\d+)[:/-](\d+)(?:[-.](\d+))?$/);
  if (range) {
    const surah = surahNumber(range[1]);
    const ayah = ayahNumber(range[2]);
    if (!surah || !ayah) return null;
    return { surah, ayah };
  }

  const parts = clean.split('/').filter(Boolean);
  const surah = surahNumber(parts[0]);
  if (!surah) return null;
  const ayah = parts.length > 1 ? ayahNumber(parts[1]) : null;
  if (parts.length > 1 && !ayah) return null;
  return { surah, ayah };
}

export function parseDeepLink(raw: string): DeepLinkAction | null {
  const input = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!input) return null;

  // Web URLs (including the protocol handler's own `/?deep=` output) are
  // reduced to their path + query before matching.
  let path = input;
  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      const deep = url.searchParams.get(DEEP_LINK_PARAM);
      if (deep) return parseDeepLink(deep);
      path = `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  }

  const schemeMatch = path.match(/^(?:furkan|web\+furkan):\/\/+(.*)$/i);
  if (schemeMatch) path = schemeMatch[1];
  else if (path.startsWith('/')) path = path.replace(/^\/+/, '');
  else if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return null; // some other app's scheme

  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  const head = segments[0]?.toLowerCase();

  if (head === 'verse' || head === 'v') {
    const coords = parseCoordinates(segments.slice(1).join('/'));
    if (!coords) return null;
    return { kind: 'navigate', to: surahPath(coords.surah, coords.ayah) };
  }

  if (head === 'loop') {
    const surah = surahNumber(segments[1]);
    const bounds = (segments[2] ?? '').match(/^(\d+)(?:[-.](\d+))?$/);
    const start = ayahNumber(bounds?.[1]);
    if (!surah || !start) return null;
    const end = ayahNumber(bounds?.[2]) ?? start;
    return { kind: 'loop', surah, start: Math.min(start, end), end: Math.max(start, end) };
  }

  if (head === 'playlist' || head === 'pl') {
    const id = decodeURIComponent(segments[1] ?? '');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
    return { kind: 'navigate', to: `/playlist/${id}` };
  }

  if (head === 'surah') {
    const surah = surahNumber(segments[1]);
    if (!surah) return null;
    const ayah = ayahNumber(params.get('ayah') ?? undefined);
    return { kind: 'navigate', to: surahPath(surah, ayah) };
  }

  if (head === 'support' || head === 'donate') {
    return { kind: 'navigate', to: '/support' };
  }

  return null;
}

/** Recovers a deep link from a location query string (e.g. `?deep=...`). */
export function deepLinkFromSearch(search: string): string | null {
  return new URLSearchParams(search).get(DEEP_LINK_PARAM);
}

/** App-internal share URL for the browser build. */
export function webDeepLink(base: string, action: DeepLinkAction): string {
  const origin = base.replace(/\/+$/, '');
  if (action.kind === 'navigate') return `${origin}${action.to}`;
  return `${origin}/?${DEEP_LINK_PARAM}=${encodeURIComponent(
    rangeDeepLink(action.surah, action.start, action.end),
  )}`;
}
