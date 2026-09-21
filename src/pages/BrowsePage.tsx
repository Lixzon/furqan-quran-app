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
import type { SurahMeta } from '../types';

type Tab = 'surah' | 'juz';

export default function BrowsePage() {
  const { surahs, juz, error, retry } = useQuran();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const progress = useAppSelector((s) => s.progress);
  const playerState = useAppSelector((s) => s.player);
  const defaultReciter = useAppSelector((s) => s.settings.defaultReciter);

  const [tab, setTab] = useState<Tab>('surah');
  const [query, setQuery] = useState('');

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

  const todayKey = new Date().toISOString().slice(0, 10);
  const hasCheckedIn = !!progress.dailyActivity[todayKey];
  const checkInSurah = progress.lastPosition?.surah ?? 1;

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
          className="w-full rounded-2xl border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-mut focus:border-accent focus:outline-none"
        />
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
