export type GuidanceCategoryId = 'routines' | 'weekly' | 'emotional' | 'family';

export interface QuranGuidanceRecommendation {
  id: string;
  category: GuidanceCategoryId;
  title: string;
  summary: string;
  reference: string;
  surahs: number[];
  startAyah?: number;
  timing?: string;
  sourceNote: string;
}

export const GUIDANCE_CATEGORIES: Array<{ id: GuidanceCategoryId; label: string }> = [
  { id: 'routines', label: 'Daily & nightly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'emotional', label: 'Emotional relief' },
  { id: 'family', label: 'Family & home' },
];

export const QURAN_GUIDANCE: QuranGuidanceRecommendation[] = [
  {
    id: 'fatiha-daily',
    category: 'routines',
    title: 'Surah Al-Fatiha',
    summary: 'Begin with the opening chapter and reflect on its praise, worship, and plea for guidance.',
    reference: 'Surah 1 · 7 ayahs',
    surahs: [1],
    timing: 'Any time',
    sourceNote: 'The Qur’an describes Al-Fatiha as a repeated prayer; its use in ruqyah is reported in Sahih al-Bukhari 5736.',
  },
  {
    id: 'yasin-morning',
    category: 'routines',
    title: 'Surah Ya-Sin',
    summary: 'A morning reading for reflection on revelation, resurrection, and the signs of Allah.',
    reference: 'Surah 36',
    surahs: [36],
    timing: 'Morning',
    sourceNote: 'A general Qur’an reading; reports specifying a special morning virtue are not established as sound.',
  },
  {
    id: 'waqiah-night',
    category: 'routines',
    title: 'Surah Al-Waqi’ah',
    summary: 'Read at night and reflect on the Hereafter, gratitude, and provision from Allah.',
    reference: 'Surah 56',
    surahs: [56],
    timing: 'Night',
    sourceNote: 'The popular report that it prevents poverty is graded weak; this is offered as Qur’an reflection, not a guarantee.',
  },
  {
    id: 'mulk-night',
    category: 'routines',
    title: 'Surah Al-Mulk',
    summary: 'A nightly recitation with a reported virtue of intercession for its reader.',
    reference: 'Surah 67',
    surahs: [67],
    timing: 'Before sleep',
    sourceNote: 'Reported in Jami’ al-Tirmidhi 2891; scholars have graded the report hasan.',
  },
  {
    id: 'three-quls',
    category: 'routines',
    title: 'The three Quls',
    summary: 'Recite Al-Ikhlas, Al-Falaq, and An-Nas three times in the morning and evening.',
    reference: 'Surahs 112–114',
    surahs: [112, 113, 114],
    timing: 'Morning & evening',
    sourceNote: 'Morning and evening protection is reported in Sunan Abi Dawud 5082 and Jami’ al-Tirmidhi 3575.',
  },
  {
    id: 'kahf-friday',
    category: 'weekly',
    title: 'Surah Al-Kahf',
    summary: 'A Friday reading for reflection on faith, trials, humility, and the limits of worldly knowledge.',
    reference: 'Surah 18',
    surahs: [18],
    timing: 'Friday',
    sourceNote: 'Reports about light between Fridays are graded hasan by a number of hadith scholars.',
  },
  {
    id: 'dua-yunus',
    category: 'emotional',
    title: 'The prayer of Yunus',
    summary: 'A supplication of repentance and hope when facing distress or feeling trapped.',
    reference: 'Al-Anbiya 21:87–88',
    surahs: [21],
    startAyah: 87,
    sourceNote: 'Qur’anic supplication; its virtue is also reported in Jami’ al-Tirmidhi 3505.',
  },
  {
    id: 'dua-musa',
    category: 'emotional',
    title: 'The prayer of Musa',
    summary: 'Ask Allah for whatever good is needed while seeking help, work, shelter, or a new beginning.',
    reference: 'Al-Qasas 28:24',
    surahs: [28],
    startAyah: 24,
    sourceNote: 'A Qur’anic supplication in the story of Musa; the verse itself does not prescribe a particular outcome.',
  },
  {
    id: 'sharh-duha',
    category: 'emotional',
    title: 'Surah Ash-Sharh & Ad-Duha',
    summary: 'Read these short chapters and reflect on reassurance, relief, and Allah’s care.',
    reference: 'Surahs 94 & 93',
    surahs: [94, 93],
    sourceNote: 'Qur’anic reflection for difficult moments; not a substitute for professional mental-health care.',
  },
  {
    id: 'yusuf-patience',
    category: 'emotional',
    title: 'Surah Yusuf',
    summary: 'Reflect on isolation, betrayal, envy, and steadfast patience through the story of Yusuf.',
    reference: 'Surah 12',
    surahs: [12],
    sourceNote: 'A Qur’anic narrative and reflection; no special occasion is prescribed.',
  },
  {
    id: 'luqman-family',
    category: 'family',
    title: 'Luqman’s advice',
    summary: 'Read timeless advice about gratitude, prayer, humility, and good character in family life.',
    reference: 'Luqman 31:12–19',
    surahs: [31],
    startAyah: 12,
    sourceNote: 'Qur’anic guidance on faith and character, including counsel from Luqman to his son.',
  },
  {
    id: 'nuh-istighfar',
    category: 'family',
    title: 'Istighfar in Surah Nuh',
    summary: 'Reflect on the call to seek forgiveness and the blessings described in these verses.',
    reference: 'Nuh 71:10–12',
    surahs: [71],
    startAyah: 10,
    sourceNote: 'The verses describe blessings; they are not a guaranteed formula for wealth or children.',
  },
  {
    id: 'baqarah-home',
    category: 'family',
    title: 'Surah Al-Baqarah at home',
    summary: 'Make regular room for this long surah in the home.',
    reference: 'Surah 2',
    surahs: [2],
    sourceNote: 'The Prophet ﷺ said Satan flees from a house in which Surah Al-Baqarah is recited (Sahih Muslim 780).',
  },
  {
    id: 'daily-protection',
    category: 'family',
    title: 'Ayat al-Kursi & the last two verses',
    summary: 'Read these verses as part of a daily remembrance and protection routine.',
    reference: 'Al-Baqarah 2:255, 285–286',
    surahs: [2],
    startAyah: 255,
    sourceNote: 'Ayat al-Kursi before sleep: Sahih al-Bukhari 2311. The last two verses at night: Sahih al-Bukhari 5009.',
  },
];

export function recommendationsForNow(date: Date): QuranGuidanceRecommendation[] {
  const isFriday = date.getDay() === 5;
  const hour = date.getHours();
  const isNight = hour >= 21 || hour < 5;
  const isMorning = hour >= 5 && hour < 12;

  const fridayPick = isFriday ? QURAN_GUIDANCE.find((item) => item.id === 'kahf-friday') : undefined;
  const picks = QURAN_GUIDANCE.filter((item) => {
    if (item.id === 'yasin-morning') return isMorning;
    if (item.id === 'waqiah-night' || item.id === 'mulk-night') return isNight;
    if (item.id === 'three-quls') return isMorning || (hour >= 15 && hour < 21);
    return false;
  });

  return [...(fridayPick ? [fridayPick] : []), ...picks].slice(0, 2);
}