import type { QuoteEntry, QuoteTheme } from '../types';

export const QUOTE_THEME_LABELS: Record<QuoteTheme, string> = {
  patience: 'Patience',
  gratitude: 'Gratitude',
  hope: 'Hope',
  hardship: 'Hardship',
  mercy: 'Mercy',
  kindness: 'Kindness',
  knowledge: 'Knowledge',
  trust: 'Trust in Allah',
  repentance: 'Repentance',
  humility: 'Humility',
  justice: 'Justice',
  charity: 'Charity',
  sincerity: 'Sincerity',
  forgiveness: 'Forgiveness',
  brotherhood: 'Brotherhood',
};

/** Every theme key, in display order. */
export const QUOTE_THEMES: QuoteTheme[] = [
  'patience',
  'gratitude',
  'hope',
  'hardship',
  'mercy',
  'kindness',
  'knowledge',
  'trust',
  'repentance',
  'humility',
  'justice',
  'charity',
  'sincerity',
  'forgiveness',
  'brotherhood',
];

/**
 * A short, curated collection of uplifting sayings.
 * Prophetic sayings are cited to their classical collections;
 * companion & scholar sayings are labelled “attributed” (sayings literature).
 */
export const QUOTES: QuoteEntry[] = [
  {
    id: 'q1',
    text: 'Actions are only by intentions, and every person will have only what they intended.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 1 · Sahih Muslim 1907',
    themes: ['sincerity', 'hope'],
  },
  {
    id: 'q2',
    text: 'None of you truly believes until he loves for his brother what he loves for himself.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 13 · Sahih Muslim 45',
    themes: ['kindness', 'brotherhood', 'justice'],
  },
  {
    id: 'q3',
    text: 'The most complete of believers in faith are those with the best character.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Jamiʿ at-Tirmidhi 1162',
    themes: ['kindness', 'humility'],
  },
  {
    id: 'q4',
    text: 'Your smiling in the face of your brother is an act of charity.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Jamiʿ at-Tirmidhi 1956',
    themes: ['kindness', 'charity', 'gratitude'],
  },
  {
    id: 'q5',
    text: 'The strong one is not the one who overcomes people by his strength; the strong one is the one who controls himself when angry.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 6114 · Sahih Muslim 2609',
    themes: ['patience', 'hardship'],
  },
  {
    id: 'q6',
    text: 'The world is a prison for the believer and a paradise for the disbeliever.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih Muslim 2956',
    themes: ['hardship', 'patience', 'hope'],
  },
  {
    id: 'q7',
    text: 'Whoever believes in Allah and the Last Day, let him speak good or remain silent.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 6018 · Sahih Muslim 47',
    themes: ['kindness', 'humility'],
  },
  {
    id: 'q8',
    text: 'Allah is Beautiful and He loves beauty.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih Muslim 91',
    themes: ['gratitude', 'sincerity'],
  },
  {
    id: 'q9',
    text: 'The best of you are those who learn the Qur’an and teach it.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 5027',
    themes: ['knowledge', 'charity'],
  },
  {
    id: 'q10',
    text: 'Do not hate one another, do not envy one another, do not turn away from one another — and be, O servants of Allah, brothers.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 6065 · Sahih Muslim 2559',
    themes: ['kindness', 'forgiveness', 'brotherhood'],
  },
  {
    id: 'q11',
    text: 'Make things easy and do not make them difficult; give glad tidings and do not repel.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 69 · Sahih Muslim 1734',
    themes: ['kindness', 'mercy'],
  },
  {
    id: 'q12',
    text: 'Riches are not from an abundance of worldly goods, but true richness is the richness of the soul.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 6446 · Sahih Muslim 1051',
    themes: ['gratitude', 'hope'],
  },
  {
    id: 'q13',
    text: 'Amazing is the affair of the believer — all of it is good. If ease comes to him he is grateful, and that is good for him; if hardship comes to him he is patient, and that is good for him.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih Muslim 2999',
    themes: ['patience', 'gratitude', 'hardship', 'trust'],
  },
  {
    id: 'q14',
    text: 'Paradise is surrounded by hardships, and the Fire is surrounded by desires.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih Muslim 2822',
    themes: ['patience', 'hope'],
  },
  {
    id: 'q15',
    text: 'When Allah loves a servant, He tests him. If he is patient, Allah chooses him, and if he is content, Allah has chosen him.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Jamiʿ at-Tirmidhi 2396',
    themes: ['patience', 'hardship', 'trust'],
  },
  {
    id: 'q16',
    text: 'If you ask, ask of Allah; and if you seek help, seek help from Allah.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Jamiʿ at-Tirmidhi 2516',
    themes: ['trust', 'hope'],
  },
  {
    id: 'q17',
    text: 'Supplication is worship.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sunan Abi Dawud 1479',
    themes: ['trust', 'hope'],
  },
  {
    id: 'q18',
    text: 'The most beloved deeds to Allah are those that are most consistent, even if they are small.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 6464 · Sahih Muslim 783',
    themes: ['sincerity', 'patience'],
  },
  {
    id: 'q19',
    text: 'Whoever relieves a believer’s distress in this world, Allah will relieve one of his distresses on the Day of Resurrection.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih Muslim 2699',
    themes: ['charity', 'kindness', 'mercy'],
  },
  {
    id: 'q20',
    text: 'Fear Allah wherever you are, and follow a bad deed with a good one that will erase it, and treat people with good character.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Jamiʿ at-Tirmidhi 1987',
    themes: ['repentance', 'kindness', 'forgiveness'],
  },
  {
    id: 'q21',
    text: 'None of you has believed until his desires follow what I have brought.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Imam an-Nawawi, al-Arbaʿin 41 (hasan sahih)',
    themes: ['sincerity', 'trust'],
  },
  {
    id: 'q22',
    text: 'Allah does not look at your outward forms and wealth, but He looks at your hearts and your deeds.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih Muslim 2564',
    themes: ['sincerity', 'humility'],
  },
  {
    id: 'q23',
    text: 'The believer is not one who eats his fill while his neighbour goes hungry.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Al-Muʿjam al-Awsat of at-Tabarani 8634 (hasan)',
    themes: ['charity', 'justice', 'kindness'],
  },
  {
    id: 'q24',
    text: 'Whoever does not thank people has not truly thanked Allah.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sunan Abi Dawud 4811 · Jamiʿ at-Tirmidhi 1955',
    themes: ['gratitude', 'kindness'],
  },
  {
    id: 'q25',
    text: 'Be mindful of Allah and He will protect you. Be mindful of Allah and you will find Him before you.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Jamiʿ at-Tirmidhi 2516',
    themes: ['trust', 'hope'],
  },
  {
    id: 'c1',
    text: 'Take account of yourselves before you are taken to account, and weigh your deeds before they are weighed.',
    by: 'ʿUmar ibn al-Khaṭṭāb (attributed)',
    source: 'Islamic sayings literature',
    themes: ['repentance', 'humility', 'sincerity'],
  },
  {
    id: 'c2',
    text: 'If your hearts were truly pure, you would never grow weary of the words of your Lord.',
    by: 'ʿUthmān ibn ʿAffān (attributed)',
    source: 'Islamic sayings literature',
    themes: ['knowledge', 'hope'],
  },
  {
    id: 'c3',
    text: 'People are asleep, and when they die they awaken.',
    by: 'ʿAlī ibn Abī Ṭālib (attributed)',
    source: 'Islamic sayings literature',
    themes: ['hope', 'hardship'],
  },
  {
    id: 'c4',
    text: 'Verily, a servant of Allah reaches, through his good manners, the rank of one who fasts and prays at night.',
    by: 'Companions of the Prophet ﷺ (attributed)',
    source: 'Adab literature',
    themes: ['kindness', 'humility'],
  },
  {
    id: 'c5',
    text: 'Knowledge is the light of the heart, the life of the soul, and the lamp of the mind.',
    by: 'ʿAlī ibn Abī Ṭālib (attributed)',
    source: 'Islamic sayings literature',
    themes: ['knowledge'],
  },
  {
    id: 'c6',
    text: 'Whoever is given gentleness is given a share of every good.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih Muslim 2593',
    themes: ['kindness', 'mercy'],
  },
  {
    id: 'c7',
    text: 'The best charity is that given when one is in need, and begin with those you support.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 1426',
    themes: ['charity', 'justice'],
  },
  {
    id: 'c8',
    text: 'Be in this world as if you were a stranger or a wayfarer.',
    by: 'Prophet Muhammad ﷺ',
    source: 'Sahih al-Bukhari 6416',
    themes: ['humility', 'hardship', 'hope'],
  },
];

/** Deterministic “quote of the day” index from a date. */
export function quoteOfTheDayIndex(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000);
  return day % QUOTES.length;
}
