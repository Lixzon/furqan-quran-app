import type { SurahMeta } from '../types';
import type { AppSection } from '../shared/sectionNavigation';

export interface AppDestination {
  label: string;
  path: string;
  section: AppSection;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function destination(label: string, path: string, section: AppSection): AppDestination {
  return { label, path, section };
}

export function findAppDestination(
  question: string,
  currentSection: AppSection,
  surahs: readonly SurahMeta[] = [],
): AppDestination | null {
  const query = normalize(question);
  if (/\b(?:ayat al kursi|ayat kursi|2:255)\b/.test(query)) {
    return currentSection === 'mishka'
      ? destination('Ayat al-Kursi remembrance', '/mishka/guidance?topic=ayat-al-kursi', 'mishka')
      : destination('Ayat al-Kursi in the Quran', '/surah/2?ayah=255', 'furqan');
  }
  const quranReference = query.match(/\b(?:surah|chapter)\s+(\d{1,3})(?:\s*(?::|ayah|verse)\s*(\d{1,3}))?\b/);
  if (quranReference) {
    const surah = Number(quranReference[1]);
    const ayah = quranReference[2] ? Number(quranReference[2]) : undefined;
    if (surah >= 1 && surah <= 114) {
      return destination(
        ayah ? `Surah ${surah}, ayah ${ayah}` : `Surah ${surah}`,
        `/surah/${surah}${ayah ? `?ayah=${ayah}` : ''}`,
        'furqan',
      );
    }
  }

  const namedSurah = surahs.find((surah) => {
    const name = normalize(surah.englishName);
    const translatedName = normalize(surah.englishNameTranslation);
    return (name.length > 2 && query.includes(name)) ||
      (translatedName.length > 2 && query.includes(translatedName));
  });
  if (namedSurah && /\b(?:surah|chapter|quran|qur an|read|recite|verse|open|take me|go to|show|find)\b/.test(query)) {
    const ayah = query.match(/\b(?:ayah|verse)\s+(\d{1,3})\b/)?.[1];
    return destination(
      ayah ? `${namedSurah.englishName}, ayah ${ayah}` : namedSurah.englishName,
      `/surah/${namedSurah.number}${ayah ? `?ayah=${Number(ayah)}` : ''}`,
      'furqan',
    );
  }

  if (/\b(?:community|community hub|events|proposals)\b/.test(query)) {
    return destination('Mishka Community Hub', '/mishka/community', 'mishka');
  }
  if (/\b(?:archive|archives|prophet stor(?:y|ies)|islamic stor(?:y|ies)|maryam stor(?:y|ies))\b/.test(query)) {
    const path = /\bmaryam\b/.test(query) ? '/mishka/archives?item=maryam-devotion' : '/mishka/archives';
    return destination(/\bmaryam\b/.test(query) ? 'Maryam archive' : 'Stories & archives', path, 'mishka');
  }
  if (/\b(?:favorite|favorites|favourite|favourites|liked|likes)\b/.test(query)) {
    return currentSection === 'mishka'
      ? destination('Mishka favorites', '/mishka/favorites?section=favorites', 'mishka')
      : destination('Furqan favorites', '/library?section=favorites', 'furqan');
  }
  if (/\b(?:dua|duas|supplication|adhkar|remembrance)\b/.test(query)) {
    return destination('Du’as', '/quotes?view=duas', 'mishka');
  }
  if (/\b(?:quote|quotes|saying|sayings|reflection)\b/.test(query)) {
    return destination('Sayings & reflections', '/quotes', 'mishka');
  }
  if (/\b(?:download|downloads|offline recitation)\b/.test(query)) {
    return destination('Downloads', '/downloads', 'furqan');
  }
  if (/\b(?:playlist|playlists)\b/.test(query)) {
    return destination('Playlists', '/playlists', 'furqan');
  }
  if (/\b(?:progress|streak|reading history|reading statistics)\b/.test(query)) {
    return destination('Progress', '/progress', 'furqan');
  }
  if (/\b(?:profile|my account)\b/.test(query)) {
    return currentSection === 'mishka'
      ? destination('Mishka profile', '/mishka/profile', 'mishka')
      : destination('Profile', '/profile', 'furqan');
  }
  if (/\b(?:setting|settings|preferences)\b/.test(query)) {
    return destination('Settings', '/settings', 'furqan');
  }
  if (/\b(?:library|collection|collections|bookmark|bookmarks)\b/.test(query)) {
    return currentSection === 'mishka'
      ? destination('Mishka Library', '/mishka/library', 'mishka')
      : destination('Furqan Library', '/library', 'furqan');
  }
  if (/\b(?:guidance|guide|advice|daily practice)\b/.test(query)) {
    return currentSection === 'mishka'
      ? destination('Mishka Guidance', '/mishka/guidance', 'mishka')
      : destination('Furqan Guidance', '/guidance', 'furqan');
  }
  if (/\b(?:home|dashboard|journey)\b/.test(query)) {
    return currentSection === 'mishka'
      ? destination('Mishka Home', '/journey', 'mishka')
      : destination('Furqan Read', '/quran', 'furqan');
  }
  if (/\b(?:read|reader|quran|qur an|furqan|recite)\b/.test(query)) {
    return destination('Furqan Read', '/quran', 'furqan');
  }
  return null;
}
