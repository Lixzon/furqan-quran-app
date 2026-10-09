export interface WordGloss {
  meaning: string;
  root?: string;
}

function normalise(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/[ۖۗۚۛۜ۞۩،؛؟]/g, '')
    .trim();
}

const GLOSSES: Record<string, WordGloss> = {
  'لا': { meaning: 'No / there is no', root: 'ن ف ي' },
  'اله': { meaning: 'Deity worthy of worship', root: 'ا ل ه' },
  'الا': { meaning: 'Except', root: 'ا ل ل' },
  'انت': { meaning: 'You', root: 'أَنْتَ' },
  'سبحانك': { meaning: 'Glory be to You', root: 'س ب ح' },
  'اني': { meaning: 'Indeed I', root: 'ا ن ن' },
  'كنت': { meaning: 'I was', root: 'ك و ن' },
  'من': { meaning: 'From / among', root: 'م ن' },
  'الظالمين': { meaning: 'The wrongdoers', root: 'ظ ل م' },
  'الحمد': { meaning: 'All praise', root: 'ح م د' },
  'لله': { meaning: 'Belongs to Allah', root: 'ا ل ه' },
  'رب': { meaning: 'Lord / nurturer', root: 'ر ب ب' },
  'العالمين': { meaning: 'The worlds', root: 'ع ل م' },
  'اياك': { meaning: 'You alone', root: 'ا ي ي' },
  'نعبد': { meaning: 'We worship', root: 'ع ب د' },
  'نستعين': { meaning: 'We seek help', root: 'ع و ن' },
};

export function wordGloss(word: string): WordGloss | undefined {
  return GLOSSES[normalise(word)];
}
