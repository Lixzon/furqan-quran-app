import type { SurahFull } from '../types';
import { getAllSurahs } from './dataClient';

export type VoiceMatchLanguage = 'ar-SA' | 'en-US';

export interface VoiceMatchResult {
  surahNumber: number;
  surahName: string;
  englishName: string;
  ayahNumber: number;
  arabicText: string;
  englishText: string;
  matchedSnippet: string;
  score: number;
}

const FILLER_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'with', 'for', 'from', 'into', 'onto', 'in', 'on', 'at', 'to', 'of',
  'it', 'its', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'then', 'so',
  'if', 'when', 'while', 'also', 'just', 'very', 'more', 'most', 'their', 'your', 'our', 'my', 'we', 'you', 'they',
  'his', 'her', 'him', 'have', 'has', 'had', 'do', 'does', 'did', 'not', 'no', 'nor', 'cannot', 'can', 'shall', 'will',
  'all', 'some', 'many', 'much', 'through', 'upon', 'under', 'after', 'before', 'throughout', 'between', 'above', 'below',
]);

function stripArabicTashkeel(value: string): string {
  return value.replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '');
}

export function normalizeArabicText(value: string): string {
  const compact = stripArabicTashkeel(value)
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673\u0675]/g, 'ا')
    .replace(/[\u0649]/g, 'ي')
    .replace(/[\u064A]/g, 'ي')
    .replace(/[\u0629]/g, 'ه')
    .replace(/[\u0648]/g, 'و')
    .replace(/[\u067E\u0686\u06C1\u06A9]/g, (char) => char)
    .replace(/\s+/g, ' ')
    .trim();

  return compact
    .replace(/[\u0650\u0651\u0652\u064E\u064F\u0657\u0653\u064C\u064D]/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/[\u061F\u060C\u061B\u002E\u002C\u0021\u003F\u002D]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeEnglishText(value: string): string {
  const withoutDiacritics = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return withoutDiacritics
    .split(' ')
    .filter((token) => token.length > 0 && !FILLER_WORDS.has(token))
    .join(' ');
}

function scoreQueryMatch(query: string, candidate: string): number {
  const cleanedQuery = normalizeEnglishText(query);
  if (!cleanedQuery) return 0;

  const queryTokens = cleanedQuery.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return 0;

  let score = 0;
  const candidateText = normalizeEnglishText(candidate);

  if (candidateText.includes(cleanedQuery)) score += 120;

  for (const token of queryTokens) {
    if (candidateText.includes(token)) score += 18;
  }

  if (candidateText.length > 0) {
    const ratio = Math.min(1, cleanedQuery.length / Math.max(candidateText.length, 1));
    score += Math.round(ratio * 30);
  }

  return score;
}

function scoreArabicMatch(query: string, candidate: string): number {
  const cleanedQuery = normalizeArabicText(query);
  if (!cleanedQuery) return 0;

  let score = 0;
  const candidateText = normalizeArabicText(candidate);
  if (candidateText.includes(cleanedQuery)) score += 140;

  const queryTokens = cleanedQuery.split(' ').filter(Boolean);
  for (const token of queryTokens) {
    if (token.length > 1 && candidateText.includes(token)) score += 20;
  }

  if (candidateText.length > 0) {
    const ratio = Math.min(1, cleanedQuery.length / Math.max(candidateText.length, 1));
    score += Math.round(ratio * 35);
  }

  return score;
}

function getSnippet(text: string, needle: string): string {
  const source = text.trim();
  const query = needle.trim();
  if (!source || !query) return source.slice(0, 80);

  const target = query.length > 45 ? query.slice(0, 45) : query;
  const index = source.toLowerCase().indexOf(target.toLowerCase());
  if (index >= 0) {
    const start = Math.max(0, index - 25);
    const end = Math.min(source.length, index + target.length + 25);
    return source.slice(start, end).replace(/\s+/g, ' ').trim();
  }

  return source.slice(0, 80);
}

function buildMatchFromAyah(surah: SurahFull, ayah: SurahFull['ayahs'][number], query: string, language: VoiceMatchLanguage): VoiceMatchResult | null {
  const arabic = normalizeArabicText(ayah.ar);
  const english = normalizeEnglishText(ayah.tr);
  const transliteration = normalizeEnglishText(ayah.tl ?? '');
  const queryText = language === 'ar-SA' ? normalizeArabicText(query) : normalizeEnglishText(query);

  if (!queryText) return null;

  const shouldMatchArabic = language === 'ar-SA' || queryText.length <= 3 || arabic.includes(queryText) || transliteration.includes(queryText);
  const shouldMatchEnglish = language === 'en-US' || english.includes(queryText) || transliteration.includes(queryText);

  if (!shouldMatchArabic && !shouldMatchEnglish) {
    const romanizedQuery = normalizeEnglishText(query);
    if (romanizedQuery && transliteration.includes(romanizedQuery)) {
      // accepted: romanised recitation matches the transliteration field
    } else {
      return null;
    }
  }

  const score =
    language === 'ar-SA'
      ? scoreArabicMatch(query, ayah.ar) + scoreQueryMatch(query, ayah.tr) + (english.includes(queryText) ? 15 : 0)
      : scoreQueryMatch(query, ayah.tr) + scoreQueryMatch(query, ayah.tl ?? '') + scoreArabicMatch(query, ayah.ar) * 0.35;

  if (score <= 0) return null;

  const matchedSnippet =
    language === 'ar-SA'
      ? getSnippet(ayah.ar, normalizeArabicText(query) || query)
      : getSnippet(ayah.tr, query);

  return {
    surahNumber: surah.number,
    surahName: surah.name,
    englishName: surah.englishName,
    ayahNumber: ayah.i,
    arabicText: ayah.ar,
    englishText: ayah.tr,
    matchedSnippet,
    score: Math.round(score),
  };
}

export async function searchRecitationMatches(
  query: string,
  language: VoiceMatchLanguage = 'ar-SA',
  limit = 8,
): Promise<VoiceMatchResult[]> {
  const cleaned = query.trim();
  if (!cleaned) return [];

  const surahs = await getAllSurahs();
  const results: VoiceMatchResult[] = [];

  for (const surah of surahs) {
    for (const ayah of surah.ayahs) {
      const match = buildMatchFromAyah(surah, ayah, cleaned, language);
      if (match) results.push(match);
    }
  }

  return results
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export async function searchRecitationMatchesByText(
  query: string,
  language: VoiceMatchLanguage = 'ar-SA',
): Promise<VoiceMatchResult[]> {
  return searchRecitationMatches(query, language, 12);
}
