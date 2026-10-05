import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DUAS, DUA_THEME_LABELS } from '../data/duas';
import { QUOTES, quoteOfTheDayIndex } from '../data/quotes';
import { GUIDANCE_CATEGORIES, QURAN_GUIDANCE } from '../data/quranGuidanceData';
import { useAppDispatch, useAppSelector } from '../store';
import { isDuaLiked, isQuoteLiked, toggleLikedDua, toggleLikedQuote } from '../store/slices/likesSlice';
import { push } from '../store/slices/toastSlice';
import { PageHeader } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { LikeButton } from '../components/ui/LikeButton';
import { player } from '../audio/controller';

type GuidanceTab = 'all' | 'duas' | 'sayings' | 'pinch' | 'recommendations';
type DhikrKey = 'subhanallah' | 'alhamdulillah' | 'allahuakbar' | 'laIlahaIllallah' | 'astaghfirullah';

const TABS: Array<{ id: GuidanceTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'duas', label: 'Duas' },
  { id: 'sayings', label: 'Sayings' },
  { id: 'pinch', label: 'In a Pinch' },
  { id: 'recommendations', label: 'Qur’an routines' },
];

const DHIKR_ITEMS: Array<{ id: DhikrKey; label: string; arabic: string; meaning?: string; goal: number | null }> = [
  { id: 'subhanallah', label: 'SubhanAllah', arabic: 'سُبْحَانَ اللَّهِ', goal: 33 },
  { id: 'alhamdulillah', label: 'Alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', goal: 33 },
  { id: 'allahuakbar', label: 'Allahu Akbar', arabic: 'اللَّهُ أَكْبَرُ', goal: 34 },
  { id: 'laIlahaIllallah', label: 'La ilaha illallah', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', goal: 1 },
  { id: 'astaghfirullah', label: 'Astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', meaning: 'I seek forgiveness from Allah', goal: null },
];

const PINCH_DUA_IDS = new Set(['distress', 'leave-home']);
const DHIKR_STORAGE_KEY = 'furqan:adhkar:daily';

interface DhikrDay {
  date: string;
  counts: Record<DhikrKey, number>;
}

function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadDhikrDay(): DhikrDay {
  const fresh: DhikrDay = {
    date: localDateKey(),
    counts: { subhanallah: 0, alhamdulillah: 0, allahuakbar: 0, laIlahaIllallah: 0, astaghfirullah: 0 },
  };
  try {
    const saved = localStorage.getItem(DHIKR_STORAGE_KEY);
    if (!saved) return fresh;
    const parsed = JSON.parse(saved) as DhikrDay;
    return parsed.date === fresh.date ? { ...fresh, counts: { ...fresh.counts, ...parsed.counts } } : fresh;
  } catch {
    return fresh;
  }
}

export default function GuidancePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const likes = useAppSelector((state) => state.likes);
  const defaultReciter = useAppSelector((state) => state.settings.defaultReciter);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState<GuidanceTab>(() =>
    TABS.some((item) => item.id === requestedTab) ? (requestedTab as GuidanceTab) : 'all',
  );
  const [dhikrDay, setDhikrDay] = useState<DhikrDay>(loadDhikrDay);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const featuredQuote = QUOTES[quoteOfTheDayIndex(new Date())] ?? QUOTES[0];

  useEffect(() => {
    try {
      localStorage.setItem(DHIKR_STORAGE_KEY, JSON.stringify(dhikrDay));
    } catch {
      // Keep counters usable for this session when storage is unavailable.
    }
  }, [dhikrDay]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const synthesis = window.speechSynthesis;
    const refreshVoices = () => setVoices(synthesis.getVoices());
    refreshVoices();
    synthesis.addEventListener('voiceschanged', refreshVoices);
    return () => {
      synthesis.cancel();
      synthesis.removeEventListener('voiceschanged', refreshVoices);
    };
  }, []);

  const filteredDuas = useMemo(() => {
    if (tab === 'pinch') return DUAS.filter((dua) => PINCH_DUA_IDS.has(dua.id));
    if (tab === 'duas') return DUAS;
    return tab === 'all' ? DUAS : [];
  }, [tab]);

  const filteredQuotes = useMemo(() => {
    if (tab === 'pinch') return QUOTES.filter((quote) => quote.themes.some((theme) => ['hardship', 'hope', 'trust'].includes(theme)));
    if (tab === 'sayings' || tab === 'all') return QUOTES;
    return [];
  }, [tab]);

  const changeTab = (next: GuidanceTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('tab');
    else params.set('tab', next === 'pinch' ? 'pinch' : next);
    setSearchParams(params, { replace: true });
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      dispatch(push('Copied to clipboard', 'success'));
    } catch {
      dispatch(push('Could not copy', 'error'));
    }
  };

  const speak = (text: string, language: 'en' | 'ar') => {
    if (!('speechSynthesis' in window)) {
      dispatch(push('Read-aloud is not supported in this browser.', 'error'));
      return;
    }
    const voice = voices.find((item) => item.lang.toLowerCase().startsWith(language));
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice?.lang ?? (language === 'ar' ? 'ar' : 'en-US');
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const countDhikr = (id: DhikrKey) => {
    setDhikrDay((current) => ({
      ...current,
      counts: { ...current.counts, [id]: current.counts[id] + 1 },
    }));
  };

  const resetDhikr = () => setDhikrDay({
    date: localDateKey(),
    counts: { subhanallah: 0, alhamdulillah: 0, allahuakbar: 0, laIlahaIllallah: 0, astaghfirullah: 0 },
  });

  return (
    <div className="page-enter">
      <PageHeader title="Guidance" subtitle="Duas, daily reminders and moments of remembrance." />

      <section className="mb-4 rounded-2xl border border-accent/25 bg-accent/8 p-4" aria-label="Quote of the day">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          <Icon name="quote" size={15} /> Quote of the day
        </div>
        <blockquote className="mt-2 text-base font-medium leading-relaxed text-ink">“{featuredQuote.text}”</blockquote>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-mut">{featuredQuote.by} · {featuredQuote.source}</p>
          <div className="flex shrink-0 items-center gap-1">
            <ActionButton label="Read saying aloud" icon="play" onClick={() => speak(featuredQuote.text, 'en')} />
            <ActionButton label="Copy saying" icon="clipboard" onClick={() => void copy(`${featuredQuote.text}\n— ${featuredQuote.by} (${featuredQuote.source})`)} />
            <LikeButton
              className="h-10 w-10"
              liked={isQuoteLiked(likes, featuredQuote.id)}
              label={isQuoteLiked(likes, featuredQuote.id) ? 'Unlike saying of the day' : 'Like saying of the day'}
              onToggle={() => dispatch(toggleLikedQuote(featuredQuote.id))}
            />
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-line bg-surface p-4" aria-label="Daily adhkar counters">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Daily Adhkar</h2>
            <p className="text-xs text-mut">Counters reset each day.</p>
          </div>
          <button type="button" onClick={resetDhikr} className="rounded-full px-3 py-2 text-xs font-medium text-mut hover:bg-surface2">Reset</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DHIKR_ITEMS.map((item) => {
            const count = dhikrDay.counts[item.id];
            const complete = item.goal !== null && count >= item.goal;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => countDhikr(item.id)}
                aria-label={`${item.label}, ${item.goal === null ? `${count} counted` : `${count} of ${item.goal}`}. Tap to count.`}
                className={`pressable flex min-h-28 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-colors ${complete ? 'border-accent bg-accent/10' : 'border-line bg-surface2 hover:border-accent/40'}`}
              >
                <span lang="ar" dir="rtl" className="ar-uthmani text-lg text-ink">{item.arabic}</span>
                <span className="mt-1 text-[11px] font-medium text-mut">{item.label}</span>
                {item.meaning && <span className="mt-1 text-[10px] leading-tight text-mut">{item.meaning}</span>}
                <span className="mt-1 text-sm font-bold tabular-nums text-accent">{count}<span className="font-normal text-mut"> / {item.goal === null ? '∞' : item.goal}</span></span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="thin-scroll -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Guidance filters">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => changeTab(item.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors ${tab === item.id ? 'bg-accent text-onaccent' : 'bg-surface text-mut hover:text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'pinch' && (
        <div className="mb-3 rounded-xl border border-line bg-surface2 px-3 py-2 text-xs leading-relaxed text-mut">
          Short reminders for moments of difficulty. Sources are shown on each item.
        </div>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-5">
          {GUIDANCE_CATEGORIES.map((category) => {
            const recommendations = QURAN_GUIDANCE.filter((item) => item.category === category.id);
            return (
              <section key={category.id} aria-label={category.label}>
                <h2 className="mb-2 text-sm font-semibold text-ink">{category.label}</h2>
                <div className="space-y-2">
                  {recommendations.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                          <p className="mt-0.5 text-xs text-accent">{item.timing ? `${item.timing} · ` : ''}{item.reference}</p>
                        </div>
                        <Icon name="book" size={18} className="shrink-0 text-accent" />
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-ink2">{item.summary}</p>
                      <p className="mt-2 text-xs leading-relaxed text-mut">{item.sourceNote}</p>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            player.playRecommendedRecitation(item.surahs[0], {
                              reciter: defaultReciter,
                              startAyahIndex: item.startAyah ? item.startAyah - 1 : null,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-full bg-surface2 px-3 py-2 text-xs font-medium text-ink pressable hover:text-accent"
                        >
                          <Icon name="play" size={14} /> Listen
                        </button>
                        {item.surahs.map((surahNumber) => (
                          <button
                            key={surahNumber}
                            type="button"
                            onClick={() => navigate(`/surah/${surahNumber}?ayah=${surahNumber === item.surahs[0] ? item.startAyah ?? 1 : 1}`)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface2 px-3 py-2 text-xs font-medium text-ink pressable hover:text-accent"
                          >
                            <Icon name="book" size={14} /> Read {item.surahs.length > 1 ? `Surah ${surahNumber}` : 'in reader'}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {filteredDuas.map((dua) => (
          <article key={dua.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">{dua.title}</h2>
                <span className="mt-1 inline-block text-[11px] text-accent">{DUA_THEME_LABELS[dua.theme]}</span>
              </div>
              <LikeButton
                liked={isDuaLiked(likes, dua.id)}
                label={isDuaLiked(likes, dua.id) ? `Unlike ${dua.title}` : `Like ${dua.title}`}
                onToggle={() => dispatch(toggleLikedDua(dua.id))}
              />
            </div>
            <p lang="ar" dir="rtl" className="ar-uthmani mt-3 text-right text-2xl leading-loose text-ink">{dua.arabic}</p>
            <p className="mt-2 text-sm italic leading-relaxed text-mut">{dua.transliteration}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink2">{dua.translation}</p>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2">
              <span className="text-[11px] text-mut">{dua.source}</span>
              <div className="flex shrink-0 items-center gap-1">
                <ActionButton label={`Read ${dua.title} aloud`} icon="play" onClick={() => speak(dua.transliteration, 'en')} />
                <ActionButton label={`Copy ${dua.title}`} icon="clipboard" onClick={() => void copy(`${dua.arabic}\n${dua.transliteration}\n${dua.translation}\n— ${dua.source}`)} />
              </div>
            </div>
          </article>
        ))}

        {filteredQuotes.map((quote) => (
          <article key={quote.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <Icon name="quote" size={17} className="mt-0.5 shrink-0 text-accent" />
                <p className="text-sm leading-relaxed text-ink">“{quote.text}”</p>
              </div>
              <LikeButton
                liked={isQuoteLiked(likes, quote.id)}
                label={isQuoteLiked(likes, quote.id) ? 'Unlike saying' : 'Like saying'}
                onToggle={() => dispatch(toggleLikedQuote(quote.id))}
              />
            </div>
            <div className="mt-2 pl-6 text-xs text-mut">{quote.by} · {quote.source}</div>
            <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2">
              <ActionButton label="Read saying aloud" icon="play" onClick={() => speak(quote.text, 'en')} />
              <ActionButton label="Copy saying" icon="clipboard" onClick={() => void copy(`${quote.text}\n— ${quote.by} (${quote.source})`)} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ActionButton({ label, icon, onClick }: { label: string; icon: 'play' | 'clipboard'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="pressable flex h-10 w-10 items-center justify-center rounded-full text-mut hover:bg-surface2 hover:text-accent"
    >
      <Icon name={icon} size={17} />
    </button>
  );
}
