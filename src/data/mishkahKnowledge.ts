export interface MishkahSource {
  id: string;
  label: string;
  reference: string;
}

export interface MishkahFaq {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  sourceIds: string[];
}

export const ISLAMIC_SCHOOLS = [
  { id: 'hanafi', name: 'Hanafi', tradition: 'Sunni' },
  { id: 'maliki', name: 'Maliki', tradition: 'Sunni' },
  { id: 'shafii', name: "Shafi'i", tradition: 'Sunni' },
  { id: 'hanbali', name: 'Hanbali', tradition: 'Sunni' },
  { id: 'jafari', name: "Ja'fari", tradition: "Shi'a" },
  { id: 'zaydi', name: 'Zaydi', tradition: "Shi'a" },
] as const;

export type IslamicSchoolId = (typeof ISLAMIC_SCHOOLS)[number]['id'];

export const MISHKAH_SOURCES: MishkahSource[] = [
  { id: 'quran-2-183', label: 'The Qur’an', reference: 'Surah Al-Baqarah 2:183' },
  { id: 'quran-2-184-185', label: 'The Qur’an', reference: 'Surah Al-Baqarah 2:184–185' },
  { id: 'quran-2-187', label: 'The Qur’an', reference: 'Surah Al-Baqarah 2:187' },
  { id: 'quran-4-103', label: 'The Qur’an', reference: 'Surah An-Nisa 4:103' },
  { id: 'bukhari-1923', label: 'Sahih al-Bukhari', reference: 'Hadith 1923' },
  { id: 'muslim-1095', label: 'Sahih Muslim', reference: 'Hadith 1095' },
];

export const MISHKAH_FAQS: MishkahFaq[] = [
  {
    id: 'fasting-purpose',
    title: 'Why do Muslims fast in Ramadan?',
    keywords: ['fast', 'fasting', 'ramadan', 'sawm', 'siyam'],
    answer:
      'The Qur’an describes fasting as prescribed for believers so that they may grow in taqwa (God-consciousness). Questions about personal circumstances or exemptions need individual guidance from a qualified scholar.',
    sourceIds: ['quran-2-183'],
  },
  {
    id: 'suhoor',
    title: 'What is suhoor?',
    keywords: ['suhoor', 'suhur', 'pre-dawn', 'pre dawn', 'meal before'],
    answer:
      'Suhoor is the meal taken before dawn during a fast. The Prophet ﷺ described blessing in suhoor. Set a local dawn reminder and follow the timetable trusted by your local mosque or religious authority.',
    sourceIds: ['bukhari-1923', 'muslim-1095'],
  },
  {
    id: 'fasting-times',
    title: 'When does the daily fast begin and end?',
    keywords: [
      'when start',
      'when end',
      'daily fast',
      'sunrise',
      'sunset',
      'iftar',
      'break my fast',
      'dawn',
      'begin',
      'begins',
      'end',
      'ends',
    ],
    answer:
      'The Qur’an describes the fasting period from dawn until night. For clock times, use a current timetable from a trusted local mosque or religious authority; calculation settings can differ.',
    sourceIds: ['quran-2-187'],
  },
  {
    id: 'fasting-exemptions',
    title: 'Illness, travel and making up fasts',
    keywords: [
      'ill',
      'illness',
      'sick',
      'travel',
      'fasting while travelling',
      'fasting while traveling',
      'missed fast',
      'make up',
      'exemption',
      'pregnan',
    ],
    answer:
      'The Qur’an discusses allowances related to illness and travel and making up missed days later. How this applies to a particular person can depend on their circumstances and scholarly guidance; please ask a qualified scholar rather than relying on a general assistant.',
    sourceIds: ['quran-2-184-185'],
  },
  {
    id: 'prayer-times',
    title: 'How should I set prayer times in a new country?',
    keywords: ['prayer time', 'new country', 'country', 'location', 'timezone', 'time zone', 'daylight', 'calculation'],
    answer:
      'Prayer-time schedules are location- and date-sensitive. In a new country, check that your device location and time zone are current, review daylight-saving changes, and use the calculation method recommended by a trusted local mosque or religious authority. In unusual daylight conditions, seek local scholarly guidance.',
    sourceIds: ['quran-4-103'],
  },
  {
    id: 'ramadan-checklist',
    title: 'A practical Ramadan checklist',
    keywords: ['checklist', 'routine', 'sunnah', 'prepare', 'daily plan'],
    answer:
      'A simple routine: confirm local dawn and sunset times, plan suhoor, make space for the five daily prayers, and arrange iftar according to the trusted local timetable. The cited hadith specifically mentions blessing in suhoor. For a Sunnah practice or personal ruling beyond this, consult a qualified scholar.',
    sourceIds: ['bukhari-1923', 'muslim-1095', 'quran-2-187'],
  },
];
