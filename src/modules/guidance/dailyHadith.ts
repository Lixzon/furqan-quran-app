export interface DailyHadith {
  id: string;
  title: string;
  summary: string;
  description: string;
  reference: string;
}

export const DAILY_HADITHS: readonly DailyHadith[] = [
  { id: 'intentions', title: 'Actions and intentions', summary: 'Deeds are judged by the intentions behind them.', description: 'A reminder to align each deed with a sincere intention.', reference: 'Sahih al-Bukhari 1; Sahih Muslim 1907' },
  { id: 'good-speech', title: 'Speak well or keep silent', summary: 'Faith calls us to honor our neighbors and guests, and to choose good speech or silence.', description: 'Encourages honoring neighbors and guests through careful speech.', reference: 'Sahih al-Bukhari 6018' },
  { id: 'gentleness', title: 'Gentleness in all matters', summary: 'Gentleness beautifies what it enters.', description: 'Shows how gentleness can improve every interaction.', reference: 'Sahih Muslim 2593' },
  { id: 'care-for-others', title: 'Care for others', summary: 'A person’s faith is connected to wishing for others the good they wish for themselves.', description: 'Calls us to wish goodness for others as we do for ourselves.', reference: 'Sahih al-Bukhari 13; Sahih Muslim 45' },
  { id: 'patience', title: 'Patience and restraint', summary: 'Patience is a gift that Allah grants to those who seek it.', description: 'A reminder to seek patience and practice restraint.', reference: 'Sahih al-Bukhari 1469' },
  { id: 'ease-hardship', title: 'Make things easier', summary: 'Whoever eases a believer’s hardship will find that Allah eases hardship for them.', description: 'Encourages easing others’ difficulties and trusting Allah’s promise.', reference: 'Sahih Muslim 2699' },
  { id: 'charity', title: 'Every good deed is charity', summary: 'Kind words and helpful actions are among the ways to give charity.', description: 'Highlights kind words and helpful actions as everyday charity.', reference: 'Sahih al-Bukhari 2989; Sahih Muslim 1009' },
];

export function getDailyHadith(date = new Date()): DailyHadith {
  const utcDay = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  const index = ((utcDay % DAILY_HADITHS.length) + DAILY_HADITHS.length) % DAILY_HADITHS.length;
  return DAILY_HADITHS[index];
}

export function getHadithById(id: string | null): DailyHadith | null {
  return id ? DAILY_HADITHS.find((hadith) => hadith.id === id) ?? null : null;
}
