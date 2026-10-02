import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuran } from '../data/QuranProvider';
import { useAppDispatch, useAppSelector } from '../store';
import { player } from '../audio/controller';
import { SurahRow } from '../components/surah/SurahRow';
import { Segmented } from '../components/ui/controls';
import { PageHeader, EmptyState, SkeletonRows, ErrorBlock } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { setJuzCompleted } from '../store/slices/progressSlice';
import { surahNumberToArabic } from '../lib/utils';
import { useVoiceSearch } from '../components/search/VoiceSearchModal';
import { useDownloadedSet } from '../services/useDownloads';
import { todayKey } from '../lib/progression';
import type { SurahMeta } from '../types';
import { islamicQuoteOfTheDay } from '../data/quotes';

type Tab = 'surah' | 'juz';

export default function BrowsePage() {
  const { surahs, juz, error, retry } = useQuran();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const progress = useAppSelector((s) => s.progress);
  const playerState = useAppSelector((s) => s.player);
  const defaultReciter = useAppSelector((s) => s.settings.defaultReciter);
  const voiceSearch = useVoiceSearch();

  const [tab, setTab] = useState<Tab>('surah');
  const [query, setQuery] = useState('');

  // Which surahs are already stored for the reader's default reciter.
  const downloaded = useDownloadedSet(defaultReciter);

  const q = query.trim().toLowerCase();
  const filtered = useMemo<SurahMeta[]>(() => {
    if (!surahs) return [];
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        String(s.number).includes(q) ||
        s.numberOfAyahs.toString() === q,
    );
  }, [surahs, q]);

  const completedJuz = useMemo(() => {
    if (!juz) return 0;
    return juz.filter((j) => progress.juzCompleted[j.juz]).length;
  }, [juz, progress.juzCompleted]);

  const today = todayKey();
  const hasCheckedIn = !!progress.dailyActivity[today];
  const checkInSurah = progress.lastPosition?.surah ?? 1;
  const dailyQuote = islamicQuoteOfTheDay(new Date());
  const streak = progress.progression.currentStreak;
  const banner = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isFriday = day === 5;
    const isThursdayEvening = (day === 4 && hour >= 18) || (isFriday && hour < 19);
    const isNight = hour >= 21 || hour < 5;
    const isProtectionWindow = (hour >= 5 && hour < 8) || (hour >= 15 && hour < 17);

    if (isThursdayEvening) {
      return {
        type: 'single' as const,
        title: 'Friday reading',
        subtitle: 'Many people begin Friday with Surah Al-Kahf for a calm, meaningful start.',
        surah: 18,
        accent: 'from-accent to-accentstrong',
      };
    }

    if (isNight) {
      return {
        type: 'multiple' as const,
        title: 'Night supplication',
        subtitle: 'Many scholars recommend Surah Al-Mulk and Surah As-Sajdah before sleep.',
        surahs: [67, 32],
        accent: 'from-slate-900 to-slate-700',
      };
    }

    if (isProtectionWindow) {
      return {
        type: 'protection' as const,
        title: 'In a pinch',
        subtitle: 'A few short protection surahs are commonly recited on the go and throughout the day.',
        surahs: [112, 113, 114],
        accent: 'from-amber-600 to-orange-500',
      };
    }

    return {
      type: 'single' as const,
      title: 'A gentle place to begin',
      subtitle: 'Take a few minutes with the Qur’an and let it settle the heart.',
      surah: 1,
      accent: 'from-accent to-accentstrong',
    };
  }, []);
  const goal = progress.progression.istiqamahGoal;
  const goalPct = Math.min(100, (streak / Math.max(1, goal)) * 100);

  if (!surahs || !juz) {
    return (
      <div>
        <PageHeader title="The Qur’an" subtitle="Browse all 114 surahs or jump in by Juz" />
        {error ? <ErrorBlock message={`Could not load data: ${error}`} onRetry={retry} /> : <SkeletonRows rows={10} />}
      </div>
    );
  }

  const startPlay = (meta: SurahMeta) => {
    if (playerState.surah === meta.number) {
      player.togglePlay();
    } else {
      player.playSingleSurah(meta.number, { reciter: defaultReciter });
    }
  };

  return (
    <div className="page-enter">
      <div className="mb-4 text-center">
        <div className="ar-uthmani text-2xl leading-relaxed text-ink" style={{ direction: 'rtl' }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
      </div>

      <div className={`mb-4 rounded-2xl bg-gradient-to-br ${banner.accent} p-4 text-onaccent shadow-card`}>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest opacity-90">
          <Icon name="sparkle" size={14} />
          {banner.title}
        </div>
        <p className="mt-2 text-sm font-medium leading-relaxed">{banner.subtitle}</p>
        {banner.type === 'single' && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={() => navigate(`/surah/${banner.surah}`)} className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold pressable">
              <Icon name="book" size={14} />
              Open Surah {banner.surah}
            </button>
            <button type="button" onClick={() => navigate('/quotes')} aria-label="Explore sayings and duas" className="shrink-0 rounded-full bg-white/20 p-2 pressable">
              <Icon name="forward" size={16} />
            </button>
          </div>
        )}
        {banner.type === 'multiple' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {banner.surahs.map((surah) => (
              <button key={surah} type="button" onClick={() => navigate(`/surah/${surah}`)} className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold pressable">
                <Icon name="book" size={14} />
                Surah {surah}
              </button>
            ))}
          </div>
        )}
        {banner.type === 'protection' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {banner.surahs.map((surah) => (
              <button key={surah} type="button" onClick={() => navigate(`/surah/${surah}`)} className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold pressable">
                <span className="tabular-nums">{surah}</span>
                <Icon name="book" size={14} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 rounded-2xl bg-gradient-to-br from-accent to-accentstrong p-4 text-onaccent shadow-card">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest opacity-90">
          <Icon name="quote" size={14} />
          Qur’an reminder for today
        </div>
        <p className="mt-2 text-sm font-medium leading-relaxed">“{dailyQuote.text}”</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-xs opacity-90">{dailyQuote.by} · {dailyQuote.source}</p>
          <button type="button" onClick={() => navigate('/quotes')} aria-label="Explore sayings and duas" className="shrink-0 rounded-full bg-white/20 p-2 pressable">
            <Icon name="forward" size={16} />
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-surface p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <Icon name="sparkle" size={16} className="text-accent" />
            {streak}-day streak
          </span>
          <span className="shrink-0 text-xs tabular-nums text-mut">
            {Math.min(streak, goal)}/{goal} towards your {goal}-day goal
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${goalPct}%` }} />
        </div>
      </div>

      <div className="mb-3 flex flex-col items-center justify-between gap-2 sm:flex-row">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'surah', label: 'Surah', icon: 'book' },
            { value: 'juz', label: 'Juz (Para)', icon: 'stack' },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate('/progress')}
          className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-mut hover:text-ink"
        >
          <Icon name="progress" size={14} className="text-accent" />
          {completedJuz}/{juz.length} Juz complete
        </button>
      </div>

      {!hasCheckedIn && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/8 p-3">
          <Icon name="book" size={20} className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">Have you read your Qur’an today?</div>
            <div className="text-xs text-mut">A few ayahs is a good place to begin.</div>
          </div>
          <button type="button" onClick={() => navigate(`/surah/${checkInSurah}`)} className="shrink-0 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-onaccent pressable">Start</button>
        </div>
      )}

      {/* search */}
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut">
          <Icon name="search" size={17} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === 'surah' ? 'Search surahs…' : 'Filter juz…'}
          className="w-full rounded-2xl border border-line bg-surface py-2.5 pl-10 pr-12 text-sm text-ink placeholder:text-mut focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={voiceSearch.open}
          aria-label="Dictate your surah search"
          title="Dictate your search term into the surah box"
          className="pressable absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-accent/12 text-accent"
        >
          <Icon name="mic" size={18} />
        </button>
      </div>

      <div className="mb-4 rounded-2xl bg-surface p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
          <Icon name="heart" size={14} className="text-accent" />
          In a pinch
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {[
            { category: 'Distress', title: 'Prophet Yunus', text: 'La ilaha illa anta...' },
            { category: 'Anxiety', title: 'Sayyid al-Istighfar', text: 'Allahumma anta rabbi...' },
            { category: 'Difficulty', title: 'Need a steady heart', text: 'A reminder that Allah is near and merciful.' },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => navigate('/quotes?view=duas')}
              className="rounded-xl border border-line bg-surface2 p-2.5 text-left pressable"
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-mut">{item.category}</div>
              <div className="mt-1 text-sm font-semibold text-ink">{item.title}</div>
              <div className="mt-1 text-xs text-mut">{item.text}</div>
            </button>
          ))}
        </div>
      </div>

      {tab === 'surah' ? (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <EmptyState icon="search" title="No surahs found" message="Try a different search term." />
          ) : (
            filtered.map((meta) => {
              const playing = playerState.surah === meta.number;
              return (
                <SurahRow
                  key={meta.number}
                  meta={meta}
                  isActive={playing}
                  playState={playing ? (playerState.isPlaying ? 'playing' : 'paused') : undefined}
                  downloaded={downloaded.has(meta.number)}
                  showPlay
                  onPlay={() => startPlay(meta)}
                />
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {juz.map((j) => {
            const start = surahs.find((s) => s.number === j.startSurah);
            const end = surahs.find((s) => s.number === j.endSurah);
            const same = j.startSurah === j.endSurah;
            const done = !!progress.juzCompleted[j.juz];
            const startAyah = j.startAyah > 1 ? j.startAyah : undefined;
            return (
              <div
                key={j.juz}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/surah/${j.startSurah}${startAyah ? `?ayah=${j.startAyah}` : ''}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    navigate(`/surah/${j.startSurah}${startAyah ? `?ayah=${j.startAyah}` : ''}`);
                }}
                className="pressable flex w-full items-center gap-3 rounded-2xl border border-transparent bg-surface p-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                  <span className="text-xs font-bold">{j.juz}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-ink">
                    Juz {j.juz} · {surahNumberToArabic(j.juz)}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-mut">
                    {same
                      ? start?.englishName
                      : `${start?.englishName ?? ''} → ${end?.englishName ?? ''}`}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={done ? `Mark Juz ${j.juz} incomplete` : `Mark Juz ${j.juz} complete`}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(setJuzCompleted({ juz: j.juz, value: !done }));
                  }}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border pressable ${
                    done
                      ? 'border-accent bg-accent text-onaccent'
                      : 'border-line2 text-mut hover:text-ink'
                  }`}
                >
                  <Icon name="check" size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
