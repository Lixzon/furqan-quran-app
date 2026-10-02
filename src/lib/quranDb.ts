import type { SurahFull } from '../types';
import { countQuranText, getQuranText, putQuranText } from '../db/database';

export interface IndoPakAyah {
  ayah: number;
  text: string;
}

export interface IndoPakSurah {
  surah: number;
  ayahs: IndoPakAyah[];
}

export function getStoredUthmaniSurah(surah: number): Promise<SurahFull | undefined> {
  return getQuranText<SurahFull>('uthmani', surah);
}

export function storeUthmaniSurah(data: SurahFull): Promise<void> {
  return putQuranText('uthmani', data.number, data);
}

export function getStoredIndoPakSurah(surah: number): Promise<IndoPakSurah | undefined> {
  return getQuranText<IndoPakSurah>('indopak', surah);
}

export function storeIndoPakSurah(data: IndoPakSurah): Promise<void> {
  return putQuranText('indopak', data.surah, data);
}

export function countStoredQuranSurahs(edition: 'uthmani' | 'indopak'): Promise<number> {
  return countQuranText(edition);
}