import { useState, type FormEvent } from 'react';
import { PageHeader } from '../components/ui/common';
import {
  ISLAMIC_SCHOOLS,
  MISHKAH_FAQS,
  MISHKAH_SOURCES,
  type IslamicSchoolId,
} from '../data/mishkahKnowledge';
import {
  answerMishkahQuestion,
  hasMishkahOnlineAssistant,
  type MishkahAnswer,
} from '../services/mishkahAssistant';
import { recordDiagnostic } from '../services/diagnostics';
import { copyText } from '../lib/share';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  schoolId?: IslamicSchoolId;
  researchQuestion?: string;
  answer?: MishkahAnswer;
  note?: string;
}

const QUICK_PROMPTS = MISHKAH_FAQS.slice(0, 4);
const SCHOOL_PREFERENCE_KEY = 'furqan:mishkah:school:v1';
const PRAYER_CONTEXT =
  /\b(prayer|pray|salah|salat|namaz|adhan|fajr|dhuhr|zuhr|asr|maghrib|isha|timezone|time zone|prayer time)\b/i;

function findSchool(value: string): IslamicSchoolId | undefined {
  return ISLAMIC_SCHOOLS.find((school) => school.id === value)?.id;
}

function savedSchool(): IslamicSchoolId | undefined {
  try {
    const stored = localStorage.getItem(SCHOOL_PREFERENCE_KEY);
    return stored ? findSchool(stored) : undefined;
  } catch {
    return undefined;
  }
}

function schoolName(schoolId?: IslamicSchoolId): string | undefined {
  return schoolId ? ISLAMIC_SCHOOLS.find((school) => school.id === schoolId)?.name : undefined;
}

function googleResearchUrl(question: string, schoolId?: IslamicSchoolId): string {
  const schoolQuery = schoolName(schoolId) ? `${schoolName(schoolId)} school` : 'Islamic';
  const query = `${question} ${schoolQuery} ruling evidence`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export default function MishkahAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [country, setCountry] = useState('');
  const [schoolId, setSchoolId] = useState<IslamicSchoolId | undefined>(savedSchool);
  const [allowOnline, setAllowOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [researchNotice, setResearchNotice] = useState('');
  const onlineConfigured = hasMishkahOnlineAssistant();
  const showPrayerContext = PRAYER_CONTEXT.test(question);

  const updateSchool = (value: string) => {
    const selected = value ? findSchool(value) : undefined;
    if (value && !selected) return;
    setSchoolId(selected);
    try {
      if (selected) localStorage.setItem(SCHOOL_PREFERENCE_KEY, selected);
      else localStorage.removeItem(SCHOOL_PREFERENCE_KEY);
    } catch {
      // The selected school remains active for this page session.
    }
  };

  const submitQuestion = async (value: string) => {
    const text = value.trim().slice(0, 1500);
    if (!text || busy) return;
    const selectedSchool = schoolId;
    const prayerCountry = PRAYER_CONTEXT.test(text) ? country : '';
    setQuestion('');
    setBusy(true);
    setMessages((current) => [...current, {
      id: `${Date.now()}-question`,
      role: 'user',
      text,
      ...(selectedSchool ? { schoolId: selectedSchool } : {}),
    }]);

    try {
      const answer = await answerMishkahQuestion(text, {
        allowOnline,
        ...(selectedSchool ? { schoolId: selectedSchool } : {}),
        ...(prayerCountry ? { country: prayerCountry } : {}),
      });
      setMessages((current) => [...current, {
        id: `${Date.now()}-answer`,
        role: 'assistant',
        text: answer.answer,
        ...(selectedSchool ? { schoolId: selectedSchool } : {}),
        researchQuestion: text,
        answer,
      }]);
    } catch (error) {
      recordDiagnostic(
        'assistant-service',
        'Mishkah online answer request failed; used offline guidance',
        error instanceof Error ? error.stack ?? '' : '',
      );
      const fallback = await answerMishkahQuestion(text, {
        allowOnline: false,
        ...(selectedSchool ? { schoolId: selectedSchool } : {}),
        ...(prayerCountry ? { country: prayerCountry } : {}),
      });
      setMessages((current) => [...current, {
        id: `${Date.now()}-fallback`,
        role: 'assistant',
        text: fallback.answer,
        ...(selectedSchool ? { schoolId: selectedSchool } : {}),
        researchQuestion: text,
        answer: fallback,
        note: 'The online assistant was unavailable, so this reply uses the offline guide.',
      }]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitQuestion(question);
  };

  const openGeminiWithPrompt = async (text: string, school?: IslamicSchoolId) => {
    window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
    const schoolContext = school
      ? `from the ${schoolName(school)} school`
      : 'with a careful comparison of schools only where reliable sources support it';
    const prompt = `Research this Islamic question ${schoolContext}. Give a careful, source-based answer, cite reliable references, explain uncertainty, and do not invent a ruling or issue personal religious advice:\n\n${text}`;
    const copied = await copyText(prompt);
    setResearchNotice(
      copied
        ? 'Question and school copied. Paste them into Gemini to continue your research.'
        : 'Gemini opened. Copy the question above and include your selected school.',
    );
  };

  const renderComposer = () => (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-surface p-3 shadow-card">
      {showPrayerContext && (
        <label htmlFor="mishkah-country" className="mb-2 block text-xs font-medium text-mut">
          Country or city for prayer-time context (optional)
          <input
            id="mishkah-country"
            value={country}
            onChange={(event) => setCountry(event.target.value.slice(0, 80))}
            placeholder="e.g. Lagos"
            maxLength={80}
            className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
      )}
      <div className="flex items-end gap-2">
        <label htmlFor="mishkah-question" className="sr-only">Your question</label>
        <textarea
          id="mishkah-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value.slice(0, 1500))}
          placeholder="Ask Rafiq AI about the Qur’an or worship…"
          rows={2}
          maxLength={1500}
          disabled={busy}
          className="min-h-11 flex-1 resize-y rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable disabled:opacity-50"
        >
          Ask
        </button>
      </div>
      {showPrayerContext && (
        <p className="mt-2 text-[11px] text-mut">
          Location is optional. For exact prayer times, follow a trusted local mosque or religious authority.
        </p>
      )}
    </form>
  );

  return (
    <div className="page-enter">
      <PageHeader
        title="Rafiq AI"
        subtitle="Qur’an, worship, and Islamic guidance in Furqan."
      />

      <p className="mb-3 text-xs leading-relaxed text-mut">
        Furqan’s offline guide gives general information—not personal fatwas.
      </p>
      <p className="mb-4 rounded-xl border border-line bg-surface2 px-3 py-2 text-xs leading-relaxed text-mut" role="status">
        {onlineConfigured
          ? 'Offline answers are always available. Enable online answers in Answer preferences when you want current, source-checked information.'
          : 'Offline answers are available. Online answers are not configured for this build; set VITE_MISHKAH_AI_ENDPOINT to enable them.'}
      </p>

      <details className="mb-4 rounded-2xl border border-line bg-surface px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Answer preferences
          <span className="ml-2 text-xs font-normal text-mut">
            · {schoolName(schoolId) ?? 'No fiqh preference'}
          </span>
        </summary>
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs leading-relaxed text-mut">
            Choose a tradition when it is relevant. Offline replies are general information, not rulings for a particular school. School-specific answers require verified sources and reasoning.
          </p>
          <label htmlFor="mishkah-school" className="mt-3 block text-xs font-medium text-mut">
            Fiqh tradition (optional)
          </label>
          <select
            id="mishkah-school"
            value={schoolId ?? ''}
            onChange={(event) => updateSchool(event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">No preference</option>
            {ISLAMIC_SCHOOLS.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name} · {school.tradition}
              </option>
            ))}
          </select>
          {onlineConfigured ? (
            <label className="mt-3 flex items-start gap-2 rounded-xl bg-surface2 p-3 text-xs leading-relaxed text-mut">
              <input
                type="checkbox"
                checked={allowOnline}
                onChange={(event) => setAllowOnline(event.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                Use the configured online AI for this session. Your question, selected tradition and relevant location context are sent to the service. Furqan does not save chat history; do not enter private details.
              </span>
            </label>
          ) : (
            <p className="mt-3 rounded-xl bg-surface2 p-3 text-xs leading-relaxed text-mut">
              No online AI service is configured. The reviewed offline guide remains available.
            </p>
          )}
        </div>
      </details>

      {messages.length === 0 ? (
        <section className="mb-3 rounded-2xl border border-dashed border-line bg-surface/60 p-4">
          <h2 className="text-sm font-semibold text-ink">Suggested questions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                disabled={busy}
                onClick={() => void submitQuestion(prompt.title)}
                className="rounded-full border border-line bg-surface px-3 py-2 text-xs font-medium text-ink pressable"
              >
                {prompt.title}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section aria-live="polite" className="mb-3 space-y-3">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-2xl border border-line p-4 ${
                message.role === 'user' ? 'ml-6 bg-accent/8' : 'mr-3 bg-surface'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-mut">
                {message.role === 'user'
                  ? `You${schoolName(message.schoolId) ? ` · ${schoolName(message.schoolId)}` : ''}`
                  : message.answer?.mode === 'online' ? 'Rafiq AI · Online-assisted' : 'Rafiq AI · Offline'}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{message.text}</p>
              {message.note && <p className="mt-2 text-xs text-mut">{message.note}</p>}
              {message.role === 'assistant' && message.answer?.schoolSpecific && (
                <div className="mt-3 rounded-xl bg-accent/8 p-3">
                  <div className="text-xs font-semibold text-ink">
                    {schoolName(message.schoolId)} reasoning
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink2">
                    {message.answer.reasoning}
                  </p>
                  {message.answer.fiqhSource && (
                    <p className="mt-2 text-[11px] text-mut">
                      Fiqh source:{' '}
                      <a
                        href={message.answer.fiqhSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        {message.answer.fiqhSource.title} · {message.answer.fiqhSource.location}
                      </a>
                    </p>
                  )}
                </div>
              )}
              {message.role === 'assistant' &&
                message.answer?.scope === 'islamic' &&
                !message.answer.schoolSpecific && (
                  <p className="mt-2 text-xs leading-relaxed text-mut">
                    General Islamic guidance only—this is not a verified
                    {schoolName(message.schoolId)
                      ? ` ${schoolName(message.schoolId)} `
                      : ' school-specific '}ruling.
                  </p>
                )}
              {message.answer && message.answer.sourceIds.length > 0 && (
                <div className="mt-3 border-t border-line pt-2">
                  <div className="text-[11px] font-semibold text-mut">Sources</div>
                  <ul className="mt-1 space-y-1">
                    {message.answer.sourceIds.map((sourceId) => {
                      const source = MISHKAH_SOURCES.find((item) => item.id === sourceId);
                      return source ? (
                        <li key={source.id} className="text-xs text-mut">
                          {source.label} · {source.reference}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}
              {message.role === 'assistant' &&
                !message.answer?.schoolSpecific &&
                message.answer?.scope !== undefined && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={googleResearchUrl(message.researchQuestion ?? '', message.schoolId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full border border-line px-3 py-2 text-xs font-medium text-ink pressable"
                    >
                      Research on Google
                    </a>
                    <button
                      type="button"
                      onClick={() => void openGeminiWithPrompt(message.researchQuestion ?? '', message.schoolId)}
                      className="inline-flex rounded-full border border-line px-3 py-2 text-xs font-medium text-ink pressable"
                    >
                      Continue with Gemini
                    </button>
                  </div>
                )}
            </article>
          ))}
          {busy && (
            <div role="status" className="mr-3 rounded-2xl border border-line bg-surface p-4 text-sm text-mut">
              Preparing a sourced response…
            </div>
          )}
        </section>
      )}

      {researchNotice && <p role="status" className="mb-3 text-center text-xs text-mut">{researchNotice}</p>}
      {renderComposer()}
    </div>
  );
}
