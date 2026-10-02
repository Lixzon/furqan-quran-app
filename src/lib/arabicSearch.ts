/**
 * Arabic text normalisation and recitation search over the bundled Qur'an text.
 *
 * Speech-recognition output never matches the Uthmani mushaf byte-for-byte: it
 * drops tashkeel (ً ٌ ٍ َ ُ ِ ْ ّ), writes the hamza forms plainly
 * (أ/إ/آ/ٱ → ا), prints ة as ه and ى as ي, and frequently omits the attached
 * و/ف particles. Normalising *both* sides and then ranking by the longest common
 * substring — rather than a plain `includes()` — keeps short recitations
 * findable even when a word or two came back wrong.
 */

import type { SurahFull } from '../types';
import { getAllSurahs } from './dataClient';
import { getQuranSearchIndex, putQuranSearchIndex } from '../db/database';

/* ------------------------------------------------------------------ */
/* normalisation                                                      */
/* ------------------------------------------------------------------ */

/**
 * Characters dropped entirely: combining marks / tashkeel, the Qur'anic
 * annotation signs (waqf marks, small high letters), the tatweel, invisible
 * formatting characters, the byte-order mark some exports leave at the head of
 * an ayah, and ayah-number digits (never recited).
 */
const STRIPPED_CHARS =
  /^[\u0610-\u061A\u0640\u064B-\u065F\u06D6-\u06ED\u06DD\u0660-\u0669\u06F0-\u06F9\u08D3-\u08E1\u08E3-\u08FF\u200B-\u200F\u202A-\u202E\uFEFF]$/;

/**
 * The Uthmani dagger alif (ٰ) doubles as the long-ā vowel: ٱلْعَٰلَمِينَ is
 * written "العالمين" in modern orthography and by speech recognition, so it has
 * to survive normalisation as a full alif rather than be dropped.
 */
const DAGGER_ALIF = '\u0670';

/** آ أ إ ٱ ٲ ٳ ٵ — every alif carrier folds back to a bare alif. */
const ALIF_FORMS = /^[\u0622\u0623\u0625\u0671\u0672\u0673\u0675]$/;

/** Any Arabic-script letter survives normalisation as-is. */
const ARABIC_LETTER = /^\p{Script=Arabic}$/u;

export interface NormalizedText {
  /** normalised text with whitespace collapsed to single spaces */
  text: string;
  /** `map[k]` is the index in the source string of normalised character `k` */
  map: number[];
}

/**
 * Normalises Arabic text while remembering where every surviving character came
 * from, so a match found in the normalised form can be highlighted in the
 * original Uthmani string.
 */
export function normalizeArabicTextWithMap(input: string): NormalizedText {
  const chars: string[] = [];
  const map: number[] = [];
  let pendingSpaceAt = -1;
  let offset = 0;

  for (const char of input) {
    const at = offset;
    offset += char.length;

    if (STRIPPED_CHARS.test(char)) continue;

    if (/\s/.test(char)) {
      if (chars.length > 0 && pendingSpaceAt < 0) pendingSpaceAt = at;
      continue;
    }

    const letter = char === DAGGER_ALIF || ALIF_FORMS.test(char)
      ? 'ا'
      : char === 'ى' || char === 'ئ'
        ? 'ي'
        : char === 'ؤ'
          ? 'و'
          : char === 'ة'
            ? 'ه'
            : ARABIC_LETTER.test(char)
              ? char
              : '';

    if (!letter) continue;

    if (pendingSpaceAt >= 0) {
      chars.push(' ');
      map.push(pendingSpaceAt);
      pendingSpaceAt = -1;
    }
    chars.push(letter);
    map.push(at);
  }

  return { text: chars.join(''), map };
}

/**
 * Removes Tashkeel / diacritical marks, folds the Alif variations (أ إ آ) to a
 * plain ا, replaces ى with ي, and strips extra spaces.
 */
export function normalizeArabicText(text: string): string {
  return normalizeArabicTextWithMap(text).text;
}

/** Keeps a highlight from clipping the diacritics that trail a matched letter. */
function extendOverMarks(text: string, end: number): number {
  let cursor = end;
  while (cursor < text.length && STRIPPED_CHARS.test(text[cursor])) cursor += 1;
  return cursor;
}

/* ------------------------------------------------------------------ */
/* corpus + index                                                     */
/* ------------------------------------------------------------------ */

const GRAM_SIZE = 3;
/** Candidates scored with the heavier similarity pass. */
const SHORTLIST = 220;
export const DEFAULT_SEARCH_LIMIT = 15;
/** Upper bound on highlighted fragments per ayah (long ayahs repeat words). */
const MAX_RANGES = 12;

interface CorpusAyah {
  surah: number;
  surahName: string;
  surahEnglishName: string;
  /** number within the surah (1-based) */
  ayah: number;
  /** global ayah number across the whole Qur'an */
  globalAyah: number;
  arabic: string;
  translation: string;
  /** normalised ayah text */
  norm: string;
  /** normalised index → original index */
  map: number[];
  /** normalised tokens, and where each starts inside `norm` */
  tokens: string[];
  tokenOffsets: number[];
}

export interface ArabicSearchIndex {
  ayahs: CorpusAyah[];
  /** character 3-gram → indices into `ayahs` */
  grams: Map<string, number[]>;
}

export interface SearchHit {
  surah: number;
  surahName: string;
  surahEnglishName: string;
  ayah: number;
  globalAyah: number;
  arabic: string;
  translation: string;
  /** ranges into `arabic` covering the matched recitation */
  ranges: Array<[number, number]>;
  score: number;
}

/** Builds the inverted character-gram index used to shortlist candidates. */
export function buildArabicSearchIndex(surahs: SurahFull[]): ArabicSearchIndex {
  const ayahs: CorpusAyah[] = [];
  const grams = new Map<string, number[]>();

  for (const surah of surahs) {
    for (const ayah of surah.ayahs) {
      const { text, map } = normalizeArabicTextWithMap(ayah.ar);
      if (!text) continue;

      const tokens = text.split(' ');
      const tokenOffsets: number[] = [];
      let offset = 0;
      for (const token of tokens) {
        tokenOffsets.push(offset);
        offset += token.length + 1;
      }

      const index = ayahs.length;
      ayahs.push({
        surah: surah.number,
        surahName: surah.name,
        surahEnglishName: surah.englishName,
        ayah: ayah.i,
        globalAyah: ayah.g,
        arabic: ayah.ar,
        translation: ayah.tr,
        norm: text,
        map,
        tokens,
        tokenOffsets,
      });

      if (text.length >= GRAM_SIZE) {
        const seen = new Set<string>();
        for (let i = 0; i + GRAM_SIZE <= text.length; i += 1) {
          const gram = text.slice(i, i + GRAM_SIZE);
          // Grams spanning a word break would match almost anything.
          if (gram.includes(' ')) continue;
          if (seen.has(gram)) continue;
          seen.add(gram);
          const bucket = grams.get(gram);
          if (bucket) bucket.push(index);
          else grams.set(gram, [index]);
        }
      }
    }
  }

  return { ayahs, grams };
}

/* ------------------------------------------------------------------ */
/* matching                                                           */
/* ------------------------------------------------------------------ */

/** Longest common substring of `needle` inside `haystack`, char codes only. */
function longestCommonSubstring(needle: string, haystack: string): { length: number; end: number } {
  if (needle.length === 0 || haystack.length === 0) return { length: 0, end: 0 };
  let previous = new Uint16Array(haystack.length + 1);
  let current = new Uint16Array(haystack.length + 1);
  let best = 0;
  let bestEnd = 0;

  for (let i = 1; i <= needle.length; i += 1) {
    const code = needle.charCodeAt(i - 1);
    for (let j = 1; j <= haystack.length; j += 1) {
      if (haystack.charCodeAt(j - 1) === code) {
        const run = previous[j - 1] + 1;
        current[j] = run;
        if (run > best) {
          best = run;
          bestEnd = j;
        }
      } else {
        current[j] = 0;
      }
    }
    const swap = previous;
    previous = current;
    current = swap;
    current.fill(0);
  }

  return { length: best, end: bestEnd };
}

/** Strips one attached proclitic (و/ف/ب/ك/ل + ال) so roots line up. */
function coreToken(token: string): string {
  if (token.length > 4 && (token[0] === 'و' || token[0] === 'ف') && token[1] === 'ا' && token[2] === 'ل') {
    return token.slice(3);
  }
  if (token.length > 3 && token.startsWith('ال')) return token.slice(2);
  return token;
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return true;
  const coreA = coreToken(a);
  const coreB = coreToken(b);
  return coreA.length >= 3 && coreA === coreB;
}

/** Longest run of consecutive matching tokens between query and ayah. */
function longestTokenRun(
  queryTokens: string[],
  ayahTokens: string[],
): { chars: number; start: number; end: number } {
  let best = { chars: 0, start: -1, end: -1 };
  for (let i = 0; i < queryTokens.length; i += 1) {
    for (let j = 0; j < ayahTokens.length; j += 1) {
      let step = 0;
      let chars = 0;
      while (
        i + step < queryTokens.length &&
        j + step < ayahTokens.length &&
        tokensMatch(queryTokens[i + step], ayahTokens[j + step])
      ) {
        chars += ayahTokens[j + step].length;
        step += 1;
      }
      if (chars > best.chars) best = { chars, start: j, end: j + step };
    }
  }
  return best;
}

/** Every occurrence of a normalised span, mapped back onto the Uthmani text. */
function highlightRanges(ayah: CorpusAyah, from: number, to: number): Array<[number, number]> {
  const needle = ayah.norm.slice(from, to);
  if (needle.length < GRAM_SIZE) return [];

  const ranges: Array<[number, number]> = [];
  let at = ayah.norm.indexOf(needle);
  while (at >= 0 && ranges.length < MAX_RANGES) {
    const start = ayah.map[at];
    const end = extendOverMarks(ayah.arabic, ayah.map[at + needle.length - 1] + 1);
    const last = ranges[ranges.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else ranges.push([start, end]);
    at = ayah.norm.indexOf(needle, at + 1);
  }
  return ranges;
}

/**
 * Searches the corpus for a recitation and ranks the ayahs by how long a
 * contiguous stretch of the query they reproduce.
 */
export function searchAyahs(query: string, index: ArabicSearchIndex, limit = DEFAULT_SEARCH_LIMIT): SearchHit[] {
  const normalized = normalizeArabicText(query);
  if (normalized.length < 2) return [];

  const queryTokens = normalized.split(' ');
  // Short queries must match almost in full; long ones tolerate a few misheard
  // words as long as a decent contiguous stretch survives.
  const minMatch =
    normalized.length <= 5 ? Math.max(2, normalized.length - 1) : Math.max(5, Math.ceil(normalized.length * 0.35));

  let candidates: CorpusAyah[];
  if (normalized.length < GRAM_SIZE) {
    candidates = index.ayahs;
  } else {
    const grams = new Set<string>();
    for (let i = 0; i + GRAM_SIZE <= normalized.length; i += 1) {
      const gram = normalized.slice(i, i + GRAM_SIZE);
      if (!gram.includes(' ')) grams.add(gram);
    }

    const hits = new Map<number, number>();
    for (const gram of grams) {
      const bucket = index.grams.get(gram);
      if (!bucket) continue;
      for (const ayahIndex of bucket) hits.set(ayahIndex, (hits.get(ayahIndex) ?? 0) + 1);
    }

    if (hits.size === 0) {
      candidates = index.ayahs;
    } else {
      const ranked = [...hits.entries()].sort((a, b) => b[1] - a[1]);
      const pool = ranked.length > SHORTLIST ? ranked.slice(0, SHORTLIST) : ranked;
      candidates = pool.map(([ayahIndex]) => index.ayahs[ayahIndex]);
    }
  }

  const results: SearchHit[] = [];
  for (const ayah of candidates) {
    const substring = longestCommonSubstring(normalized, ayah.norm);
    const run = longestTokenRun(queryTokens, ayah.tokens);
    const best = Math.max(substring.length, run.chars);
    if (best < minMatch) continue;

    // Highlight whichever explanation is stronger: a token run reads better than
    // an incidental character overlap, even when the latter is marginally longer.
    const useRun = run.chars >= substring.length && run.start >= 0;
    const from = useRun ? ayah.tokenOffsets[run.start] : substring.end - substring.length;
    const to = useRun
      ? ayah.tokenOffsets[run.end - 1] + ayah.tokens[run.end - 1].length
      : substring.end;

    const atWordStart = from === 0 || ayah.norm[from - 1] === ' ';
    const atWordEnd = to === ayah.norm.length || ayah.norm[to] === ' ';
    const boundaryBonus = atWordStart && atWordEnd ? 4 : 0;

    // Trim the spaces the match may have picked up at either end.
    let highlightFrom = from;
    let highlightTo = to;
    while (highlightFrom < highlightTo && ayah.norm[highlightFrom] === ' ') highlightFrom += 1;
    while (highlightTo > highlightFrom && ayah.norm[highlightTo - 1] === ' ') highlightTo -= 1;

    results.push({
      surah: ayah.surah,
      surahName: ayah.surahName,
      surahEnglishName: ayah.surahEnglishName,
      ayah: ayah.ayah,
      globalAyah: ayah.globalAyah,
      arabic: ayah.arabic,
      translation: ayah.translation,
      ranges: highlightRanges(ayah, highlightFrom, highlightTo),
      score: best * 10 + Math.min(substring.length, run.chars) + boundaryBonus,
    });
  }

  results.sort((a, b) => b.score - a.score || a.surah - b.surah || a.ayah - b.ayah);
  return results.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* cached index                                                       */
/* ------------------------------------------------------------------ */

let cachedIndex: ArabicSearchIndex | null = null;

/** Loads the whole Qur'an on first use, then reuses the built index. */
export async function loadArabicSearchIndex(): Promise<ArabicSearchIndex> {
  if (cachedIndex) return cachedIndex;
  try {
    const stored = await getQuranSearchIndex<ArabicSearchIndex>('arabic-v1');
    if (stored && Array.isArray(stored.ayahs) && stored.grams instanceof Map) {
      cachedIndex = stored;
      return stored;
    }
  } catch {
    // Build the index from local text files if IndexedDB is unavailable.
  }
  const surahs = await getAllSurahs();
  cachedIndex = buildArabicSearchIndex(surahs);
  try {
    await putQuranSearchIndex('arabic-v1', cachedIndex);
  } catch {
    // Search remains available for this session when persistent storage fails.
  }
  return cachedIndex;
}

export function clearArabicSearchIndex(): void {
  cachedIndex = null;
}
