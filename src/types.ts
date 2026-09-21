/** Shared domain types for Furqan. */

export interface AyahData {
  /** global ayah number across the whole Quran */
  g: number;
  /** number within the surah (1-based) */
  i: number;
  /** Arabic text (Uthmani script) */
  ar: string;
  /** English translation (Sahih International) */
  tr: string;
  /** English transliteration */
  tl: string;
}

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  numberOfAyahs: number;
}

export interface SurahFull extends SurahMeta {
  hasBasmalaPrefix: boolean;
  ayahs: AyahData[];
}

export interface JuzBoundary {
  juz: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

/* ---------------- playlists ---------------- */

export interface PlaylistItem {
  id: string;
  /** surah number 1..114 */
  surah: number;
  /** how many times this surah repeats before the queue moves on */
  repeat: number;
}

export interface Playlist {
  id: string;
  name: string;
  reciter: string; // reciter edition id
  createdAt: number;
  items: PlaylistItem[];
}

/** Player repeat semantics layered on top of per-item repeat counts. */
export type PlayerRepeatMode = 'off' | 'all';

/* ---------------- progress ---------------- */

export interface ReaderPosition {
  /** numberInSurah last read */
  ayah: number;
  at: number;
}

export type ActivityKind = 'read' | 'listen';

export interface ActivityEntry {
  surah: number;
  ayah: number;
  name: string;
  at: number;
  kind: ActivityKind;
}

export interface QuoteHistoryEntry {
  id: string;
  at: number;
}

export interface ProgressState {
  /** per surah: last read ayah position (numberInSurah) */
  lastRead: Record<number, ReaderPosition>;
  /** per surah: timestamp of last full listen */
  lastListened: Record<number, number>;
  /** per surah: read to the end (auto-marked) */
  surahCompleted: Record<number, boolean>;
  /** 30 juz, whether marked complete */
  juzCompleted: Record<number, boolean>;
  /** Latest position across reading and listening sessions. */
  lastPosition: ActivityEntry | null;
  /** Small chronological activity log used by history and recent-item views. */
  activity: ActivityEntry[];
  /** ISO date keys for days with at least one reading/listening event. */
  dailyActivity: Record<string, boolean>;
  /** Count of ayahs reached at least once per surah. */
  ayahsReached: Record<number, number>;
  /** Quote views/favorites, newest first. */
  quoteHistory: QuoteHistoryEntry[];
}

/* ---------------- quotes ---------------- */

export type QuoteTheme =
  | 'patience'
  | 'gratitude'
  | 'hope'
  | 'hardship'
  | 'mercy'
  | 'kindness'
  | 'knowledge'
  | 'trust'
  | 'repentance'
  | 'humility'
  | 'justice'
  | 'charity'
  | 'sincerity'
  | 'forgiveness'
  | 'brotherhood';

export interface QuoteEntry {
  id: string;
  text: string;
  /** who said it */
  by: string;
  /** e.g. "Sahih al-Bukhari" */
  source: string;
  /** chapter/reference inside the source */
  reference?: string;
  themes: QuoteTheme[];
}

/* ---------------- downloads / reciters ---------------- */

export interface Reciter {
  id: string;
  label: string;
  arabicName: string;
  /** islamic.network audio edition key */
  edition: string;
  bitrate: 64 | 128 | 192;
}

export interface DownloadRecord {
  key: string; // `${reciter}|${surah}`
  reciter: string;
  surah: number;
  size: number;
  at: number;
}

/* ---------------- settings / theme ---------------- */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ScriptStyle = 'uthmani' | 'naskh' | 'clear';
export type AccentId = 'teal' | 'emerald' | 'green' | 'gold' | 'blue' | 'rose' | 'purple';

export interface SettingsState {
  showArabic: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
  arabicFontScale: number; // multiplier, e.g. 1.6
  script: ScriptStyle;
  readingMode: boolean; // distraction free
  defaultReciter: string;
  followAudio: boolean; // auto-scroll/highlight reader to the playing ayah
  notifications: {
    daily: boolean;
    fridayKahf: boolean;
    nightlyMulk: boolean;
    reminderTime: string;
  };
}

export interface ThemeState {
  mode: ThemeMode;
  accent: AccentId;
}
