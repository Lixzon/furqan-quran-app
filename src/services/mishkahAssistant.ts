import {
  ISLAMIC_SCHOOLS,
  MISHKAH_FAQS,
  MISHKAH_SOURCES,
  type IslamicSchoolId,
} from '../data/mishkahKnowledge';

export interface MishkahAnswer {
  answer: string;
  sourceIds: string[];
  mode: 'offline' | 'online';
  scope: 'islamic' | 'uncertain';
  schoolId?: IslamicSchoolId;
  schoolSpecific: boolean;
  reasoning?: string;
  fiqhSource?: {
    title: string;
    location: string;
    url: string;
  };
}

export interface MishkahRequestOptions {
  allowOnline: boolean;
  schoolId?: IslamicSchoolId;
  country?: string;
}

const MAX_QUESTION_LENGTH = 1500;
const MAX_ANSWER_LENGTH = 5000;
const REQUEST_TIMEOUT_MS = 20_000;
const ISLAMIC_TERMS = [
  'islam',
  'muslim',
  'quran',
  'qur’an',
  'qur an',
  'hadith',
  'sunnah',
  'fiqh',
  'madhhab',
  'madhab',
  'hanafi',
  'maliki',
  'shafi',
  'hanbali',
  'jafari',
  'ja’fari',
  'zaydi',
  'salah',
  'salat',
  'prayer in islam',
  'prayer time',
  'prayer-time',
  'namaz',
  'wudu',
  'fasting',
  'my fast',
  'fast during',
  'fast while',
  'breaking fast',
  'ramadan',
  'suhoor',
  'suhur',
  'iftar',
  'zakat',
  'halal',
  'haram',
  'fatwa',
  'sharia',
  'shari’a',
  'nikah',
  'hajj',
  'umrah',
  'mosque',
  'masjid',
  'adhan',
  'قرآن',
  'إسلام',
  'مسلم',
  'صلاة',
  'زكاة',
  'صوم',
  'رمضان',
  'فقه',
  'حديث',
  'حلال',
  'حرام',
];

function isIslamicQuestion(question: string): boolean {
  const normalized = question.toLocaleLowerCase();
  return ISLAMIC_TERMS.some((term) => normalized.includes(term));
}

function offlineAnswer(question: string, schoolId?: IslamicSchoolId, country?: string): MishkahAnswer {
  const normalized = question.toLowerCase();
  const faq = MISHKAH_FAQS
    .map((item) => ({
      item,
      score: item.keywords.reduce(
        (total, keyword) => total + (normalized.includes(keyword) ? keyword.length : 0),
        0,
      ),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.item;

  if (faq) {
    const region = country?.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80);
    const answer = faq.id === 'prayer-times' && region
      ? `For ${region}: use a current timetable from a trusted local mosque or religious authority, and verify your device time zone and any daylight-saving change. I do not have verified country-specific calculation settings or calculate prayer times offline. ${faq.answer}`
      : faq.answer;
    return {
      answer,
      sourceIds: faq.sourceIds,
      mode: 'offline',
      scope: 'islamic',
      ...(schoolId ? { schoolId } : {}),
      schoolSpecific: false,
    };
  }
  return {
    answer:
      'I’m offline and do not have a reviewed answer for this question. This assistant covers Islamic topics only; for a school-specific ruling or a complex question, consult a qualified scholar or use the research links below.',
    sourceIds: [],
    mode: 'offline',
    scope: 'islamic',
    ...(schoolId ? { schoolId } : {}),
    schoolSpecific: false,
  };
}

function configuredEndpoint(): string {
  return import.meta.env?.VITE_MISHKAH_AI_ENDPOINT?.trim() ?? '';
}

function resolveEndpoint(endpoint: string): string {
  const url = new URL(endpoint, window.location.origin);
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The assistant endpoint cannot contain credentials, query parameters or fragments.');
  }
  const localDevelopmentOrigin =
    import.meta.env?.DEV === true && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.origin !== window.location.origin && url.protocol !== 'https:' && !localDevelopmentOrigin) {
    throw new Error('The assistant endpoint must use HTTPS.');
  }
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFiqhSource(value: unknown): MishkahAnswer['fiqhSource'] | null {
  if (
    !isRecord(value) ||
    typeof value.title !== 'string' ||
    typeof value.location !== 'string' ||
    typeof value.url !== 'string' ||
    !value.title.trim() ||
    !value.location.trim() ||
    value.title.length > 200 ||
    value.location.length > 300
  ) {
    return null;
  }
  try {
    const url = new URL(value.url);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return {
      title: value.title.trim(),
      location: value.location.trim(),
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

async function requestOnlineAnswer(
  question: string,
  schoolId: IslamicSchoolId | undefined,
  country?: string,
): Promise<MishkahAnswer> {
  const endpoint = configuredEndpoint();
  if (!endpoint) throw new Error('Online assistant is not configured for this build.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(resolveEndpoint(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        question,
        schoolId: schoolId ?? null,
        schools: ISLAMIC_SCHOOLS,
        ...(country ? { country } : {}),
        approvedSources: MISHKAH_SOURCES,
        responseFormat: {
          answer: 'string',
          sourceIds: 'array of approved source IDs',
          schoolId: 'the selected school ID, or null when no school is selected',
          schoolSpecific: 'boolean; true only when the ruling is verified for that school',
          reasoning: 'required concise reasoning for a school-specific ruling',
          fiqhSource: 'required object with source title, precise location, and HTTPS URL for a school-specific ruling',
          verified: 'boolean; true only after server-side source and policy checks',
        },
        guardrails: {
          islamicTopicsOnly: true,
          refuseNonIslamicQuestions: true,
          requireSourceIds: true,
          requireSelectedSchoolForFiqh: true,
          requireFiqhEvidenceAndReasoning: true,
          doNotInventSchoolDifferencesOrSources: true,
          doNotIssuePersonalReligiousAdvice: true,
          discloseUncertainty: true,
          responseLanguage: 'en',
        },
      }),
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Assistant service returned ${response.status}.`);
    const payload: unknown = await response.json();
    if (
      !isRecord(payload) ||
      payload.verified !== true ||
      typeof payload.answer !== 'string' ||
      payload.answer.trim().length === 0 ||
      payload.answer.length > MAX_ANSWER_LENGTH ||
      !Array.isArray(payload.sourceIds) ||
      payload.schoolId !== (schoolId ?? null) ||
      typeof payload.schoolSpecific !== 'boolean'
    ) {
      throw new Error('Assistant service returned an unsupported or unverified response.');
    }
    const fiqhSource = isRecord(payload) ? parseFiqhSource(payload.fiqhSource) : null;
    if (
      payload.schoolSpecific &&
      (!schoolId ||
        typeof payload.reasoning !== 'string' ||
        payload.reasoning.trim().length === 0 ||
        payload.reasoning.length > 3000 ||
        !fiqhSource)
    ) {
      throw new Error('Assistant service did not provide verified school-specific reasoning and a source.');
    }

    const allowedSources = new Set(MISHKAH_SOURCES.map((source) => source.id));
    const sourceIds = [...new Set(payload.sourceIds.filter(
      (id): id is string => typeof id === 'string' && allowedSources.has(id),
    ))];
    if (sourceIds.length === 0) {
      throw new Error('Assistant response did not include a recognized source.');
    }

    return {
      answer: payload.answer.trim(),
      sourceIds,
      mode: 'online',
      scope: 'islamic',
      ...(schoolId ? { schoolId } : {}),
      schoolSpecific: payload.schoolSpecific,
      ...(payload.schoolSpecific && typeof payload.reasoning === 'string'
        ? { reasoning: payload.reasoning.trim() }
        : {}),
      ...(payload.schoolSpecific && fiqhSource ? { fiqhSource } : {}),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function hasMishkahOnlineAssistant(): boolean {
  return configuredEndpoint().length > 0;
}

export async function answerMishkahQuestion(
  question: string,
  options: MishkahRequestOptions,
): Promise<MishkahAnswer> {
  const boundedQuestion = question.trim().slice(0, MAX_QUESTION_LENGTH);
  if (!boundedQuestion) throw new Error('Enter a question first.');
  if (!isIslamicQuestion(boundedQuestion)) {
    return {
      answer: 'I can’t tell whether this question is about Islam. Furqan can help with Islamic topics only. You can rephrase it with the Islamic context, or research it externally.',
      sourceIds: [],
      mode: 'offline',
      scope: 'uncertain',
      ...(options.schoolId ? { schoolId: options.schoolId } : {}),
      schoolSpecific: false,
    };
  }
  if (!options.allowOnline || !navigator.onLine || !hasMishkahOnlineAssistant()) {
    return offlineAnswer(boundedQuestion, options.schoolId, options.country);
  }
  return requestOnlineAnswer(
    boundedQuestion,
    options.schoolId,
    options.country?.trim().slice(0, 80),
  );
}
