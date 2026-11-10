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

export interface GuidanceSource {
  label: string;
  url: string;
}

export interface PracticalGuidance {
  id: string;
  title: string;
  summary: string;
  practice: string;
  sources: readonly GuidanceSource[];
}

export const PRACTICAL_GUIDANCE: readonly PracticalGuidance[] = [
  {
    id: 'eating-with-good-manners',
    title: 'Eat with gratitude and good manners',
    summary: 'The Prophet ﷺ taught a child to mention Allah’s name, eat with the right hand, and take food from what is near.',
    practice: 'Begin with Bismillah, eat without waste, and give thanks. The manners are Prophetic; the Qur’an also tells believers not to be excessive.',
    sources: [
      { label: 'Sahih al-Bukhari 5376', url: 'https://sunnah.com/bukhari:5376' },
      { label: 'Qur’an 7:31', url: 'https://quran.com/7/31' },
    ],
  },
  {
    id: 'fruit-and-black-seed',
    title: 'Fruit and seeds, with their sources in view',
    summary: 'The Qur’an names dates, grapes, olives, and other fruits among Allah’s signs. A hadith also mentions black seed in a healing context.',
    practice: 'Enjoy wholesome foods as food. Do not turn a religious text into a cure-all claim or replace medical advice with a supplement.',
    sources: [
      { label: 'Qur’an 16:11', url: 'https://quran.com/16/11' },
      { label: 'Sahih al-Bukhari 5688', url: 'https://sunnah.com/bukhari:5688' },
    ],
  },
  {
    id: 'beneficial-movement',
    title: 'Build strength through beneficial habits',
    summary: 'The Prophet ﷺ praised the strong believer and encouraged seeking what is beneficial while asking Allah for help.',
    practice: 'Choose safe, regular movement that suits your health. This narration gives a principle of strength and benefit; it does not prescribe a particular workout.',
    sources: [{ label: 'Sahih Muslim 2664', url: 'https://sunnah.com/muslim:2664' }],
  },
  {
    id: 'modest-dress',
    title: 'Dress with modesty and dignity',
    summary: 'The Qur’an gives guidance on modesty, and the Prophet ﷺ distinguished appreciation of good appearance from pride.',
    practice: 'Choose clean, dignified clothing and avoid arrogance. Detailed dress rulings can differ by school and circumstance; ask a trusted scholar about personal questions.',
    sources: [
      { label: 'Qur’an 24:30–31', url: 'https://quran.com/24/30-31' },
      { label: 'Sahih Muslim 91a', url: 'https://sunnah.com/muslim:91a' },
    ],
  },
  {
    id: 'guard-the-tongue',
    title: 'Leave mockery, suspicion, and backbiting',
    summary: 'The Qur’an warns against ridicule, offensive nicknames, suspicion, spying, and speaking ill of people behind their backs.',
    practice: 'If a conversation turns to humiliating someone, redirect it. The Prophet ﷺ taught believers to speak good or remain silent.',
    sources: [
      { label: 'Qur’an 49:11–12', url: 'https://quran.com/49/11-12' },
      { label: 'Sahih al-Bukhari 6018', url: 'https://sunnah.com/bukhari:6018' },
    ],
  },
  {
    id: 'listen-before-speaking',
    title: 'Listen carefully, then speak for good',
    summary: 'The Qur’an praises those who listen attentively and follow what is best.',
    practice: 'A reflection exercise—not a quoted hadith: pause, listen without interrupting, and answer only when you can do so fairly and helpfully.',
    sources: [{ label: 'Qur’an 39:18', url: 'https://quran.com/39/18' }],
  },
  {
    id: 'serve-at-home',
    title: 'Let kindness begin at home',
    summary: 'When asked about the Prophet’s conduct at home, ʿA’ishah described him helping his family and going to prayer when its time came.',
    practice: 'Take one useful household task off someone else’s hands, while keeping the prayer obligations in their proper place.',
    sources: [{ label: 'Sahih al-Bukhari 6039', url: 'https://sunnah.com/bukhari:6039' }],
  },
  {
    id: 'care-for-teeth',
    title: 'Care for cleanliness before worship',
    summary: 'The Prophet ﷺ strongly encouraged cleaning the teeth with siwak, especially in connection with prayer.',
    practice: 'Keep up good oral hygiene. Siwak is a Prophetic practice; ordinary dental care remains useful and is not replaced by this reminder.',
    sources: [{ label: 'Sahih al-Bukhari 887', url: 'https://sunnah.com/bukhari:887' }],
  },
  {
    id: 'learn-from-early-generations',
    title: 'Learn the Prophets’ and Companions’ example carefully',
    summary: 'The Qur’an praises the earliest believers, and authentic reports describe the excellence of the Prophet’s generation.',
    practice: 'Study a specific action through its Qur’anic passage or a checked narration. Do not treat unsourced viral quotes or invented stories as history.',
    sources: [
      { label: 'Qur’an 9:100', url: 'https://quran.com/9/100' },
      { label: 'Sahih al-Bukhari 2652', url: 'https://sunnah.com/bukhari:2652' },
    ],
  },
  {
    id: 'small-consistent-deeds',
    title: 'Keep doing small good deeds',
    summary: 'The Prophet ﷺ taught that the deeds most beloved to Allah are those done consistently, even if they are small.',
    practice: 'Choose one sustainable act—prayer on time, charity, helping someone, or a few verses—and keep returning to it.',
    sources: [
      { label: 'Sahih al-Bukhari 6464', url: 'https://sunnah.com/bukhari:6464' },
      { label: 'Sahih Muslim 783', url: 'https://sunnah.com/muslim:783' },
    ],
  },
];

export interface MomentGuidance {
  id: string;
  moment: string;
  arabic?: string;
  transliteration?: string;
  meaning: string;
  practice?: string;
  sources: readonly GuidanceSource[];
}

export const EVERYDAY_MOMENTS: readonly MomentGuidance[] = [
  {
    id: 'rain-begins',
    moment: 'When rain begins',
    arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا',
    transliteration: 'Allahumma ṣayyiban nāfiʿan.',
    meaning: 'O Allah, make it a beneficial rain.',
    sources: [{ label: 'Sahih al-Bukhari 1032', url: 'https://sunnah.com/bukhari:1032' }],
  },
  {
    id: 'after-rain',
    moment: 'After rainfall',
    arabic: 'مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ',
    transliteration: 'Muṭirnā bi-faḍlillāhi wa-raḥmatih.',
    meaning: 'We have been given rain by Allah’s bounty and mercy.',
    practice: 'This is a remembrance of gratitude reported after rain, rather than a forecast or weather explanation.',
    sources: [{ label: 'Sahih al-Bukhari 846', url: 'https://sunnah.com/bukhari:846' }],
  },
  {
    id: 'bad-dream',
    moment: 'After a disturbing dream',
    meaning: 'Seek Allah’s protection from its evil and from Satan, lightly blow to the left three times, turn to the other side, and do not recount it.',
    practice: 'These steps are from the narration; a frightening dream is not a prediction. Seek personal support if distress continues.',
    sources: [
      { label: 'Sahih Muslim 2261a', url: 'https://sunnah.com/muslim:2261a' },
      { label: 'Sahih al-Bukhari 7044', url: 'https://sunnah.com/bukhari:7044' },
    ],
  },
  {
    id: 'waking-up',
    moment: 'When waking up',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: 'Al-ḥamdu lillāhi alladhī aḥyānā baʿda mā amātanā wa ilayhi an-nushūr.',
    meaning: 'All praise is for Allah, who gave us life after causing us to die, and to Him is the resurrection.',
    sources: [{ label: 'Sahih al-Bukhari 6312', url: 'https://sunnah.com/bukhari:6312' }],
  },
  {
    id: 'going-to-sleep',
    moment: 'Before going to sleep',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amūtu wa-aḥyā.',
    meaning: 'In Your name, O Allah, I die and I live.',
    sources: [{ label: 'Sahih al-Bukhari 6324', url: 'https://sunnah.com/bukhari:6324' }],
  },
  {
    id: 'dua-of-yunus',
    moment: 'In distress: the supplication of Yunus',
    arabic: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    transliteration: 'Lā ilāha illā anta, subḥānaka, innī kuntu minaẓ-ẓālimīn.',
    meaning: 'There is no deity except You; glory be to You. Indeed, I was among the wrongdoers.',
    practice: 'A Qur’anic supplication from the account of Prophet Yunus; read it with reflection, not as a guaranteed formula for a particular result.',
    sources: [{ label: 'Qur’an 21:87', url: 'https://quran.com/21/87' }],
  },
];

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