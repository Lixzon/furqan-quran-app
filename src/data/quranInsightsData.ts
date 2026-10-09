export interface QuranVerseInsight {
  reference: string;
  asbabAlNuzul: string;
  tafsirSummary: string;
  source: string;
  lessons: [string, string, string?];
}

/** Concise paraphrases for study; these are not presented as verbatim tafsir. */
export const QURAN_INSIGHTS: Record<string, QuranVerseInsight> = {
  '1:5': {
    reference: 'Al-Fatihah 1:5',
    asbabAlNuzul: 'No specific occasion of revelation is asserted here. The verse sits at the centre of Al-Fatihah, turning praise into direct worship and a request for help.',
    tafsirSummary: 'The servant singles out Allah for worship and dependence, joining devotion with reliance.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Al-Fatihah 1:5',
    lessons: ['Ask for help while taking responsible steps.', 'Let worship shape ordinary choices, not only formal prayer.', 'Begin difficult work with humility.'],
  },
  '2:255': {
    reference: 'Al-Baqarah 2:255',
    asbabAlNuzul: 'This verse is part of Al-Baqarah; no particular occasion is claimed in this summary.',
    tafsirSummary: 'Ayat al-Kursi describes Allah’s unique life, knowledge, sovereignty, and sustaining care over creation.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Al-Baqarah 2:255',
    lessons: ['Remember that responsibility is not the same as control over every outcome.', 'Let knowledge of Allah’s care steady anxious decision-making.'],
  },
  '2:285': {
    reference: 'Al-Baqarah 2:285–286',
    asbabAlNuzul: 'These closing verses conclude Al-Baqarah with faith, accountability, and a prayer for mercy and help.',
    tafsirSummary: 'The passage affirms the messengers and asks Allah not to burden people beyond their capacity, while seeking pardon and support.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Al-Baqarah 2:285–286',
    lessons: ['Pair belief with humility about personal limits.', 'Ask for forgiveness and help when you fall short.', 'Take the next manageable step instead of giving up.'],
  },
  '2:286': {
    reference: 'Al-Baqarah 2:286',
    asbabAlNuzul: 'The verse closes the surah with supplications for mercy, pardon, and strength.',
    tafsirSummary: 'The verse teaches that moral responsibility is within human capacity and models prayer for compassion and assistance.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Al-Baqarah 2:286',
    lessons: ['Distinguish a hard season from a hopeless one.', 'Ask trusted people for help when a burden feels too heavy.', 'Pray for strength while using the support available to you.'],
  },
  '12:86': {
    reference: 'Yusuf 12:86',
    asbabAlNuzul: 'This is within the narrative of Ya‘qub’s grief over Yusuf; it is not presented as a separate revelation occasion.',
    tafsirSummary: 'Ya‘qub expresses sorrow to Allah while continuing to hope in Allah’s mercy and knowledge.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Yusuf 12:86',
    lessons: ['Honest grief and trust can exist together.', 'Take painful feelings to Allah without pretending they are absent.', 'Seek human care as well as spiritual comfort when needed.'],
  },
  '18:10': {
    reference: 'Al-Kahf 18:10',
    asbabAlNuzul: 'The verse begins the account of the youths who sought refuge in the cave; no additional occasion is asserted.',
    tafsirSummary: 'The youths ask Allah for mercy and sound direction when their circumstances threaten their faith.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Al-Kahf 18:10',
    lessons: ['Ask for guidance when facing pressure.', 'Choose company and environments that support your values.', 'A short prayer can help clarify the next right step.'],
  },
  '21:87': {
    reference: 'Al-Anbiya 21:87–88',
    asbabAlNuzul: 'The passage recalls Yunus calling upon Allah from distress; no separate occasion of revelation is claimed.',
    tafsirSummary: 'Yunus acknowledges Allah’s perfection and his own error. The next verse describes Allah’s response and deliverance.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Al-Anbiya 21:87–88',
    lessons: ['Name distress honestly and turn toward help.', 'Repentance can begin with a single sincere prayer.', 'This passage offers spiritual comfort, not a replacement for professional care.'],
  },
  '21:88': {
    reference: 'Al-Anbiya 21:87–88',
    asbabAlNuzul: 'The verse completes the account of Yunus and Allah’s deliverance.',
    tafsirSummary: 'The passage presents Allah’s response to Yunus as mercy and deliverance for those who believe.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Al-Anbiya 21:87–88',
    lessons: ['Do not conclude that a difficult moment is the whole story.', 'Seek both spiritual and practical support.', 'Hold hope without demanding a particular timetable.'],
  },
  '28:24': {
    reference: 'Al-Qasas 28:24',
    asbabAlNuzul: 'Musa makes this prayer after helping two women water their flock while away from Egypt.',
    tafsirSummary: 'Musa turns to Allah after offering practical help, asking for whatever good Allah sends.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Al-Qasas 28:24',
    lessons: ['Help where you can, even while facing uncertainty.', 'Ask Allah for good broadly rather than claiming a guaranteed result.', 'Pair prayer with practical efforts in work and family life.'],
  },
  '31:17': {
    reference: 'Luqman 31:17',
    asbabAlNuzul: 'This is part of Luqman’s counsel to his son, not a separate revelation occasion.',
    tafsirSummary: 'Luqman connects prayer, encouraging good, resisting harm, and patience through difficulty.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Luqman 31:17',
    lessons: ['Build family advice around lived example.', 'Speak against harm with wisdom and care.', 'Patience is needed when doing what is right.'],
  },
  '71:10': {
    reference: 'Nuh 71:10–12',
    asbabAlNuzul: 'These verses recount Nuh calling his people to seek forgiveness; they are not a guaranteed formula for wealth or children.',
    tafsirSummary: 'Nuh invites his people to repentance and describes blessings in the language of his appeal.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Nuh 71:10–12',
    lessons: ['Make room for repentance and repair.', 'Read the passage in context rather than as a transactional promise.', 'Gratitude includes using blessings responsibly.'],
  },
  '94:5': {
    reference: 'Ash-Sharh 94:5–6',
    asbabAlNuzul: 'The surah reassures the Prophet ﷺ amid hardship; this note does not assign it to a specific incident.',
    tafsirSummary: 'The repeated assurance that ease accompanies hardship calls the listener to hope and perseverance.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Ash-Sharh 94:5–6',
    lessons: ['Look for support and openings while facing difficulty.', 'Do not mistake patience for having to cope alone.', 'Seeking professional support is compatible with spiritual practice.'],
  },
  '93:3': {
    reference: 'Ad-Duha 93:3–5',
    asbabAlNuzul: 'The surah reassures the Prophet ﷺ; reports differ on the immediate context, so no single report is asserted here.',
    tafsirSummary: 'The passage rejects the idea that Allah has abandoned His Messenger and points toward future gifts and care.',
    source: 'Paraphrased from Tafsir Ibn Kathir on Ad-Duha 93:3–5',
    lessons: ['A feeling of distance is not proof that you have been abandoned.', 'Recall care already received when the present feels uncertain.', 'Offer care to people facing loneliness.'],
  },
};

export function insightForAyah(surah: number, ayah: number): QuranVerseInsight | undefined {
  return QURAN_INSIGHTS[`${surah}:${ayah}`];
}
