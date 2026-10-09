const STANDARD_REFLECTIONS = [
  'You made a little space for the Qur’an today. Let that be enough for this moment.',
  'A steady return matters. Carry one line with you into the rest of the day.',
  'May what you read settle gently in your heart.',
  'You can return to the next ayah whenever you are ready.',
  'A quiet moment with the Qur’an is still a meaningful one.',
  'Let reflection continue at its own pace, without hurry.',
  'May this reading bring clarity to one small decision today.',
  'The page can wait. Take the calm you found with you.',
  'Consistency grows through ordinary, unhurried returns.',
  'You gave attention to something lasting today.',
  'May the words you read be a source of patience and perspective.',
  'One sincere moment can be the beginning of another.',
  'Keep what was useful; return to the rest another time.',
  'There is no need to rush a reading that deserves reflection.',
  'May your next step be guided by what you have learned.',
  'A short reading offered with care is not a small thing.',
  'Leave room for the meaning to accompany you beyond the page.',
  'You can begin again with the next ayah, whenever you choose.',
  'May this pause leave you a little more grounded.',
  'Thank yourself for making room for a quiet return.',
] as const;

const RARE_REFLECTIONS = [
  '“So remember Me; I will remember you.” Al-Baqarah 2:152. Let remembrance be gentle, not hurried.',
  '“With hardship comes ease.” Ash-Sharh 94:5–6. Hold the promise with patience, and seek the support you need.',
  '“My mercy encompasses all things.” Al-A‘raf 7:156. Make room for hope and for the work of repair.',
  '“Indeed, Allah is with the patient.” Al-Baqarah 2:153. You do not have to carry difficulty alone.',
  '“Our Lord, pour upon us patience.” Al-Baqarah 2:250. A quiet prayer can accompany practical effort.',
  '“My Lord, increase me in knowledge.” Ta-Ha 20:114. Stay open to learning one thing at a time.',
  '“Do not despair of the mercy of Allah.” Az-Zumar 39:53. Return with honesty and hope.',
  '“Allah does not burden a soul beyond what it can bear.” Al-Baqarah 2:286. Ask for help with what feels heavy.',
  '“Indeed, in the remembrance of Allah do hearts find rest.” Ar-Ra‘d 13:28. Let that rest come without pressure.',
  '“Our Lord, accept this from us.” Al-Baqarah 2:127. Sincerity matters more than display.',
] as const;

export type SessionReflection = { text: string; rarity: 'standard' | 'rare' };

/** 80% standard reflections, 20% rare Qur’anic reminders. */
export function chooseSessionReflection(random = Math.random): SessionReflection {
  if (random() < 0.2) {
    const index = Math.floor(random() * RARE_REFLECTIONS.length);
    return { text: RARE_REFLECTIONS[index], rarity: 'rare' };
  }
  const index = Math.floor(random() * STANDARD_REFLECTIONS.length);
  return { text: STANDARD_REFLECTIONS[index], rarity: 'standard' };
}

export const SESSION_REFLECTION_COUNTS = {
  standard: STANDARD_REFLECTIONS.length,
  rare: RARE_REFLECTIONS.length,
} as const;
