import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { getSurah } from '../../lib/dataClient';
import { TOTAL_QURAN_AYAHS } from '../../lib/progression';
import { toggleAyahBookmark } from '../../store/slices/bookmarksSlice';
import { push } from '../../store/slices/toastSlice';
import { player } from '../../audio/controller';
import { useQuran } from '../../data/QuranProvider';
import { Icon } from '../ui/Icon';
import { ReadScene, type ReadSceneType } from './ReadScene';
import { QURAN_GUIDANCE } from '../../data/quranGuidanceData';
import type { AyahData } from '../../types';

const HOME_RECOMMENDATIONS: Array<{
  id: string;
  title: string;
  description: string;
  scene: ReadSceneType;
}> = [
  { id: 'sharh-duha', title: 'For anxiety & stress', description: 'Reflect on reassurance and Allah’s care.', scene: 'clouds' },
  { id: 'fatiha-daily', title: '5 minutes for daily Quran', description: 'A gentle place to begin: Al-Fatiha.', scene: 'quran' },
  { id: 'daily-protection', title: 'Powerful passages', description: 'Explore Ayat al-Kursi and the closing verses.', scene: 'arch' },
  { id: 'mulk-night', title: 'Surahs before bed', description: 'Make a quiet space for a nightly reading.', scene: 'night' },
  { id: 'kahf-friday', title: 'Friday surah', description: 'Set aside time for reflection on Al-Kahf.', scene: 'mosque' },
];

interface DailyVerse {
  surah: number;
  ayah: AyahData;
  surahName: string;
}

export function ReadDashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { surahs } = useQuran();
  const progress = useAppSelector((state) => state.progress);
  const settings = useAppSelector((state) => state.settings);
  const bookmarks = useAppSelector((state) => state.bookmarks.items);
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const lastBookmark = bookmarks[0];
  const lastPosition = progress.lastPosition;
  const verseIsBookmarked = verse
    ? bookmarks.some((bookmark) => bookmark.id === `${verse.surah}:${verse.ayah.i}`)
    : false;

  useEffect(() => {
    if (!surahs?.length) return;
    let alive = true;
    const now = new Date();
    const yearStart = Date.UTC(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - yearStart) / 86_400_000);
    const targetGlobalAyah = (dayOfYear % 6236) + 1;
    let cumulative = 0;
    const target = surahs.find((item) => {
      cumulative += item.numberOfAyahs;
      return cumulative >= targetGlobalAyah;
    });
    if (!target) return;
    const ayahNumber = target.numberOfAyahs - (cumulative - targetGlobalAyah);
    void getSurah(target.number)
      .then((data) => {
        if (alive) setVerse({ surah: target.number, ayah: data.ayahs[ayahNumber - 1], surahName: target.englishName });
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [surahs]);

  const toggleBookmark = () => {
    if (!verse) return;
    dispatch(toggleAyahBookmark({
      id: `${verse.surah}:${verse.ayah.i}`,
      surah: verse.surah,
      ayah: verse.ayah.i,
      surahName: verse.surahName,
      arabic: verse.ayah.ar,
      translation: verse.ayah.tr,
    }));
  };

  const shareVerse = async () => {
    if (!verse) return;
    const text = `${verse.ayah.ar}\n${verse.ayah.tr}\n— ${verse.surahName} ${verse.surah}:${verse.ayah.i}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Verse of the day', text });
      else await navigator.clipboard.writeText(text);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') dispatch(push('Could not share this verse.', 'error'));
    }
  };

  const playVerse = () => {
    if (verse) player.playSingleSurah(verse.surah, { reciter: settings.defaultReciter, startAyahIndex: verse.ayah.i - 1 });
  };

  const khatamAyahsPerDay = Math.ceil(TOTAL_QURAN_AYAHS / settings.khatamTargetDays);

  return (
    <section className="mb-5 space-y-3" aria-label="Daily reading dashboard">
      {verse && (
        <article className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 text-white shadow-card backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:shadow-emerald-900/20">
          <ReadScene scene="quran" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-200">Verse of the day</div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Play verse of the day" title="Play verse" onClick={playVerse} className="rounded-full p-2 text-white/80 hover:bg-white/10"><Icon name="play" size={17} /></button>
                <button
                  type="button"
                  aria-label={verseIsBookmarked ? 'Remove verse bookmark' : 'Bookmark verse'}
                  aria-pressed={verseIsBookmarked}
                  title="Bookmark verse"
                  onClick={toggleBookmark}
                  className="rounded-full p-2 text-white/80 hover:bg-white/10"
                >
                  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill={verseIsBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                  </svg>
                </button>
                <button type="button" aria-label="Share verse of the day" title="Share verse" onClick={() => void shareVerse()} className="rounded-full p-2 text-white/80 hover:bg-white/10"><Icon name="forward" size={17} /></button>
              </div>
            </div>
            <button type="button" onClick={() => navigate(`/surah/${verse.surah}?ayah=${verse.ayah.i}`)} className="mt-1 block w-full text-left">
              <p dir="rtl" lang="ar" className="ar-uthmani text-right text-2xl leading-[1.9] text-white">{verse.ayah.ar}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/85">{verse.ayah.tr}</p>
              <p className="mt-2 text-xs font-medium text-white/65">{verse.surahName} · {verse.surah}:{verse.ayah.i}</p>
            </button>
          </div>
        </article>
      )}

      <button
        type="button"
        onClick={() => lastPosition
          ? navigate(`/surah/${lastPosition.surah}?ayah=${lastPosition.ayah}`)
          : lastBookmark && navigate(`/surah/${lastBookmark.surah}?ayah=${lastBookmark.ayah}`)}
        disabled={!lastPosition && !lastBookmark}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/60 px-3.5 py-3 text-left text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 disabled:cursor-default"
      >
          <Icon name="pin" size={18} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-emerald-200">
              {lastPosition ? 'Continue reading' : 'Continue from bookmark'}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-white">
              {lastPosition
                ? `${lastPosition.surah}. ${lastPosition.name} · Ayah ${lastPosition.ayah}`
                : lastBookmark
                  ? `${lastBookmark.surah}. ${lastBookmark.surahName} · Ayah ${lastBookmark.ayah}`
                  : 'Your last reading position will appear here'}
            </span>
          </span>
          <Icon name="forward" size={16} className="shrink-0 text-white/60" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="group relative isolate flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 text-left text-white shadow-card backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:shadow-emerald-900/20"
      >
        <ReadScene scene="quran" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        <span className="relative min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-200">Khatam planner</span>
          <span className="mt-1 block text-base font-semibold">
            {settings.khatamPlannerEnabled ? `A gentle ${settings.khatamTargetDays}-day reading plan` : 'Make space for a complete reading'}
          </span>
          <span className="mt-1 block text-xs text-white/70">
            {settings.khatamPlannerEnabled
              ? `About ${khatamAyahsPerDay} ayahs each day`
              : 'Choose a pace that feels steady and sustainable'}
          </span>
        </span>
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
          <Icon name="forward" size={17} />
        </span>
      </button>

      <section aria-label="Quran reading recommendations">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-mut">A quiet place to begin</h2>
          <button type="button" onClick={() => navigate('/guidance')} className="text-xs font-medium text-accent hover:underline">More guidance</button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {HOME_RECOMMENDATIONS.map((recommendation) => {
            const passage = QURAN_GUIDANCE.find((item) => item.id === recommendation.id);
            if (!passage) return null;
            return (
              <button
                key={recommendation.id}
                type="button"
                onClick={() => navigate(`/surah/${passage.surahs[0]}?ayah=${passage.startAyah ?? 1}`)}
                className="group relative isolate flex min-h-36 flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-3 text-left text-white shadow-card backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-900/20"
              >
                <ReadScene scene={recommendation.scene} />
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <span className="relative text-sm font-semibold leading-snug">{recommendation.title}</span>
                <span className="relative mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/75">{recommendation.description}</span>
                <span className="relative mt-2 text-[10px] font-medium text-emerald-200">{passage.reference}</span>
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}
