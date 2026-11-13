import type { AppSection } from './sectionNavigation';
import { getSurah } from '../lib/dataClient';

export async function preloadSectionDestination(section: AppSection, destination: string): Promise<void> {
  const modulePromise = section === 'mishka'
    ? import('../modules/guidance')
    : import('../modules/quran');

  const pagePromises: Promise<unknown>[] = [modulePromise];
  if (destination.startsWith('/mishka/archives')) pagePromises.push(import('../pages/MishkaArchivesPage'));
  else if (destination.startsWith('/mishka/guidance')) pagePromises.push(import('../pages/MishkaGuidancePage'));
  else if (destination.startsWith('/mishka/library')) pagePromises.push(import('../pages/MishkaLibraryPage'));
  else if (destination.startsWith('/mishka/community')) pagePromises.push(import('../pages/MishkaCommunityPage'));
  else if (destination.startsWith('/surah/')) {
    pagePromises.push(import('../pages/SurahReader'));
    const surahNumber = Number(destination.slice('/surah/'.length).split(/[/?#]/, 1)[0]);
    if (Number.isInteger(surahNumber) && surahNumber > 0 && surahNumber <= 114) {
      pagePromises.push(getSurah(surahNumber));
    }
  } else if (destination === '/quran') pagePromises.push(import('../pages/BrowsePage'));

  await Promise.all(pagePromises);
}
