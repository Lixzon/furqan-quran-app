import type { AccentId, Reciter, ScriptStyle } from '../types';

export const APP_NAME = 'Furqan';
export const APP_NAME_AR = 'الفرقان';
export const APP_TAGLINE = 'Offline Quran — read, listen, reflect';

export const MAX_PLAYLIST_ITEMS = 10;

/* ---------------- accent themes ---------------- */

export interface AccentOption {
  id: AccentId;
  label: string;
  swatch: string; // representative colour for the picker
}

export const ACCENTS: AccentOption[] = [
  { id: 'teal', label: 'Teal', swatch: '#0d9488' },
  { id: 'emerald', label: 'Emerald', swatch: '#10b981' },
  { id: 'green', label: 'Green', swatch: '#16a34a' },
  { id: 'gold', label: 'Gold', swatch: '#c9a227' },
  { id: 'blue', label: 'Blue', swatch: '#2563eb' },
  { id: 'rose', label: 'Rose', swatch: '#e11d48' },
  { id: 'purple', label: 'Purple', swatch: '#7c3aed' },
];

/* ---------------- Arabic script styles ---------------- */

export interface ScriptStyleOption {
  id: ScriptStyle;
  label: string;
  description: string;
  className: string;
}

export const SCRIPT_STYLES: ScriptStyleOption[] = [
  {
    id: 'uthmani',
    label: 'Uthmani',
    description: 'Classical Uthmani mushaf script',
    className: 'ar-uthmani',
  },
  {
    id: 'naskh',
    label: 'Naskh',
    description: 'Traditional Naskh calligraphy',
    className: 'ar-naskh',
  },
  {
    id: 'clear',
    label: 'Clear Naskh',
    description: 'Modern, easy-to-read Naskh',
    className: 'ar-clear',
  },
];

export function scriptClassName(script: ScriptStyle): string {
  const found = SCRIPT_STYLES.find((s) => s.id === script);
  return found ? found.className : 'ar-uthmani';
}

/* ---------------- reciters ---------------- */

const CDN = (bitrate: number, edition: string) => (surah: number) => {
  const path = `/audio-surah/${bitrate}/${edition}/${surah}.mp3`;
  return import.meta.env.DEV ? path : `https://cdn.islamic.network/quran${path}`;
};

export const RECITERS: Reciter[] = [
  { id: 'ar.alafasy', label: 'Mishary Rashid Alafasy', arabicName: 'مشاري راشد العفاسي', edition: 'ar.alafasy', bitrate: 128 },
  { id: 'ar.abdulbasitmurattal', label: 'Abdul Basit (Murattal)', arabicName: 'عبد الباسط عبد الصمد', edition: 'ar.abdulbasitmurattal', bitrate: 128 },
  { id: 'ar.abdurrahmaansudais', label: 'Abdur-Rahman As-Sudais', arabicName: 'عبد الرحمن السديس', edition: 'ar.abdurrahmaansudais', bitrate: 128 },
  { id: 'ar.saudalshuraym', label: 'Saud Ash-Shuraym', arabicName: 'سعود الشريم', edition: 'ar.saudalshuraym', bitrate: 128 },
  { id: 'ar.saadghamdi', label: 'Saad Al-Ghamdi', arabicName: 'سعد الغامدي', edition: 'ar.saadghamdi', bitrate: 128 },
  { id: 'ar.mahermuaiqly', label: 'Maher Al-Muaiqly', arabicName: 'ماهر المعيقلي', edition: 'ar.mahermuaiqly', bitrate: 128 },
  { id: 'ar.husary', label: 'Mahmoud Khalil Al-Husary', arabicName: 'محمود خليل الحصري', edition: 'ar.husary', bitrate: 128 },
  { id: 'ar.minshawi', label: 'Muhammad Siddiq Al-Minshawi', arabicName: 'محمد صديق المنشاوي', edition: 'ar.minshawi', bitrate: 128 },
  { id: 'ar.muhammadayyoub', label: 'Muhammad Ayyub', arabicName: 'محمد أيوب', edition: 'ar.muhammadayyoub', bitrate: 128 },
  { id: 'ar.hanirifai', label: 'Hani Ar-Rifai', arabicName: 'هاني الرفاعي', edition: 'ar.hanirifai', bitrate: 128 },
  { id: 'ar.muhammadjibreel', label: 'Muhammad Jibreel', arabicName: 'محمد جبريل', edition: 'ar.muhammadjibreel', bitrate: 128 },
];

export function reciterById(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

export function audioStreamUrl(reciter: string, surah: number): string {
  const r = reciterById(reciter);
  return CDN(r.bitrate, r.edition)(surah);
}

/* ---------------- default values ---------------- */

export const DEFAULT_ACCENT: AccentId = 'teal';
export const DEFAULT_RECITER = 'ar.alafasy';
export const DEFAULT_ARABIC_SCALE = 1.7;

/** theme colour applied to the browser chrome */
export function accentHex(accent: AccentId, dark: boolean): string {
  const map: Record<AccentId, [string, string]> = {
    teal: ['#0d9488', '#2dd4bf'],
    emerald: ['#10b981', '#34d399'],
    green: ['#16a34a', '#4ade80'],
    gold: ['#c08a1e', '#e3b341'],
    blue: ['#2563eb', '#60a5fa'],
    rose: ['#e11d48', '#fb7185'],
    purple: ['#7c3aed', '#a78bfa'],
  };
  return dark ? map[accent][1] : map[accent][0];
}
