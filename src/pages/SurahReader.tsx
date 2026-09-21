import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { player } from '../audio/controller';
import { getSurah } from '../lib/dataClient';
import { useQuran } from '../data/QuranProvider';
import { rememberRead } from '../store/slices/progressSlice';
import {
  setArabicFontScale,
  setDefaultReciter,
  setFollowAudio,
  setReadingMode,
  setScript,
  setShowArabic,
  setShowTransliteration,
  setShowTranslation,
} from '../store/slices/settingsSlice';
import { SCRIPT_STYLES, scriptClassName, RECITERS } from '../lib/constants';
import { clamp } from '../lib/utils';
import { Icon } from '../components/ui/Icon';
import { Segmented, Slider, Toggle } from '../components/ui/controls';
import { Modal } from '../components/ui/Modal';
import { ErrorBlock, SkeletonRows } from '../components/ui/common';
import type { AyahData, SettingsState, SurahFull } from '../types';

export default function SurahReader() {
  const { number } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const surahNumber = Number(number);

  const settings = useAppSelector((s) => s.settings);
  const playerState = useAppSelector((s) => s.player);
  const lastRead = useAppSelector((s) => s.progress.lastRead[surahNumber]);
  const { surahs, juz } = useQuran();

  const [surah, setSurah] = useState<SurahFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [activeAyah, setActiveAyah] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'book'>('list');

  const validSurahNumber = Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114;

  const refs = useRef(new Map<number, HTMLDivElement>());
  const initTarget = useRef<number | null>(null);

  const fromUrl = useMemo(() => {
    const a = Number(searchParams.get('ayah'));
    return Number.isFinite(a) && a > 0 ? a : null;
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    if (!validSurahNumber) {
      setLoading(false);
      setError('That chapter number is not valid.');
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    setError(null);
    setSurah(null);
    getSurah(surahNumber)
      .then((d) => {
        if (!alive) return;
        setSurah(d);
        // register length weights for proportional audio highlight
        player.setWeights(d.ayahs.map((a) => a.ar.length));
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [surahNumber, attempt, validSurahNumber]);

  // Initial target: URL ?ayah → last-read → 1
  useEffect(() => {
    if (!surah) return;
    const resume = lastRead?.ayah;
    const startRaw = (fromUrl ?? resume ?? 1) - 1;
    const start = clamp(startRaw, 0, surah.ayahs.length - 1);
    setActiveAyah(start);
    initTarget.current = start;
  }, [surah?.number]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToAyah = useCallback(
    (index: number, smooth: boolean) => {
      const el = refs.current.get(index);
      if (!el) return;
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    },
    [],
  );

  // One-time scroll to the resume target after first paint.
  useEffect(() => {
    if (initTarget.current === null) return;
    if (initTarget.current === activeAyah && refs.current.has(activeAyah)) {
      const t = initTarget.current;
      initTarget.current = null;
      const raf = requestAnimationFrame(() => scrollToAyah(t, false));
      return () => cancelAnimationFrame(raf);
    }
  }, [activeAyah, scrollToAyah, surah?.number]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist reading position when the active ayah changes.
  useEffect(() => {
    if (!surah) return;
    dispatch(rememberRead({ surah: surah.number, ayah: activeAyah + 1, name: surah.englishName }));
  }, [activeAyah, surah, dispatch]);

  // Follow the sounding ayah while audio plays on this surah.
  useEffect(() => {
    const { ayah, isPlaying } = playerState;
    const same = playerState.surah === surah?.number;
    if (!surah || !same || !isPlaying || ayah === null || !settings.followAudio) return;
    if (ayah !== activeAyah) {
      // cancel any pending “resume” jump so it can’t fight live playback
      initTarget.current = null;
      setActiveAyah(ayah);
      scrollToAyah(ayah, true);
    }
  }, [playerState.ayah, playerState.surah, playerState.isPlaying, settings.followAudio, activeAyah, scrollToAyah, surah?.number]); // eslint-disable-line react-hooks/exhaustive-deps

  const isActiveSession = playerState.surah === surahNumber;
  const currentJuz = useMemo(() => {
    if (!juz) return null;
    return juz.reduce<(typeof juz)[number] | null>((found, boundary) => {
      const startsBeforeSurah = boundary.startSurah < surahNumber;
      const startsInSurah = boundary.startSurah === surahNumber && boundary.startAyah <= 1;
      return startsBeforeSurah || startsInSurah ? boundary : found;
    }, null);
  }, [juz, surahNumber]);

  const handleSelect = (index: number) => {
    setActiveAyah(index);
    // If audio is already playing on this surah, jump playback to this ayah.
    if (isActiveSession && playerState.isPlaying) {
      player.seekToAyah(index);
    }
  };

  const handlePlay = () => {
    if (!surah) return;
    if (isActiveSession) {
      if (playerState.isPlaying) player.pause();
      else void player.play();
    } else {
      player.playSingleSurah(surah.number, {
        reciter: settings.defaultReciter,
        startAyahIndex: activeAyah,
      });
    }
  };

  const handleQuickVisibility = () => {
    const showLines = !(settings.showTranslation || settings.showTransliteration);
    dispatch(setShowTranslation(showLines));
    dispatch(setShowTransliteration(showLines));
  };

  if (loading || (!surah && !error)) {
    return (
      <div className="page-enter">
        <ReaderBar
          backLabel="Qur’an"
          onBack={() => navigate('/')}
          center={<div className="h-5 w-32 rounded bg-surface2" />}
          actions={<div className="h-5 w-24 rounded bg-surface2" />}
          onOptions={() => setOptionsOpen(true)}
        />
        <div className="mt-4">
          <SkeletonRows rows={12} />
        </div>
      </div>
    );
  }

  if (error || !surah) {
    return (
      <div className="page-enter">
        <ErrorBlock
          message={`Couldn’t load this surah: ${error ?? 'unknown error'}`}
          onRetry={() => setAttempt((a) => a + 1)}
        />
      </div>
    );
  }

  const arFontPx = Math.round(26 * settings.arabicFontScale);
  const arClass = scriptClassName(settings.script);
  const showBasmala = surah.number !== 1 && surah.number !== 9;

  return (
    <div className="page-enter">
      {/* sticky toolbar */}
      <ReaderBar
        backLabel="Qur’an"
        onBack={() => navigate('/')}
        center={
          <label className="flex min-w-0 flex-1 items-center justify-center gap-1 text-sm font-semibold text-ink">
            <select
              value={surah.number}
              onChange={(event) => navigate(`/surah/${event.target.value}`)}
              aria-label="Choose surah"
              className="max-w-[10rem] truncate appearance-none bg-transparent text-center text-sm font-semibold text-ink focus:outline-none"
            >
              {(surahs ?? [surah]).map((item) => (
                <option key={item.number} value={item.number}>
                  {item.number}. {item.englishName}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={15} className="shrink-0 text-mut" />
          </label>
        }
        onOptions={() => setOptionsOpen(true)}
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Toggle translation and transliteration"
              title="Show or hide translation lines"
              onClick={handleQuickVisibility}
              className={`pressable rounded-full p-2 ${settings.showTranslation || settings.showTransliteration ? 'bg-accent/15 text-accent' : 'text-mut'}`}
            >
              <Icon name={settings.showTranslation || settings.showTransliteration ? 'eye' : 'eyeOff'} size={20} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode((mode) => (mode === 'list' ? 'book' : 'list'))}
              aria-label={`Switch to ${viewMode === 'list' ? 'book' : 'list'} view`}
              title={`${viewMode === 'list' ? 'Book' : 'List'} view`}
              className={`pressable rounded-full p-2 ${viewMode === 'list' ? 'text-mut' : 'bg-accent/15 text-accent'}`}
            >
              <Icon name={viewMode === 'list' ? 'list' : 'book'} size={20} />
            </button>
          </div>
        }
      />

      <div className="mt-3 mb-3 text-center">
        <div className="text-xs font-medium uppercase tracking-widest text-mut">
          Juz {currentJuz?.juz ?? '—'} · {surah.englishName}
        </div>
        <div className="mt-1 text-xs text-mut">{surah.revelationType} · {surah.numberOfAyahs} āyāt</div>
        <div className={`${arClass} mt-3 text-3xl text-ink`} style={{ direction: 'rtl' }}>
          {surah.name}
        </div>
        <div className="text-sm text-mut">{surah.englishNameTranslation}</div>
        {showBasmala && (
          <div className={`${arClass} mt-4 text-2xl leading-loose text-ink2`} style={{ direction: 'rtl' }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
        )}
      </div>

      {/* ayahs */}
      <div className="mt-2">
        {surah.ayahs.map((a, i) => {
          const sounding = isActiveSession && playerState.isPlaying && playerState.ayah === i;
          const selected = activeAyah === i;
          return (
            <AyahBlock
              key={a.g}
              ayah={a}
              index={i}
              arClass={arClass}
              arFontPx={arFontPx}
              showArabic={settings.showArabic}
              showTranslation={settings.showTranslation}
              showTransliteration={settings.showTransliteration}
              sounding={sounding}
              selected={selected}
              registerRef={(el) => {
                if (el) refs.current.set(i, el);
                else refs.current.delete(i);
              }}
              onSelect={() => handleSelect(i)}
            />
          );
        })}
      </div>

      <ReaderBottomBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isPlaying={isActiveSession && playerState.isPlaying}
        onPlay={handlePlay}
      />

      {/* reader options modal */}
      <ReaderOptions
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        settings={settings}
        dispatch={dispatch}
      />
    </div>
  );
}

/* ============================ Ayah block ============================ */
function AyahBlock({
  ayah,
  index,
  arClass,
  arFontPx,
  showArabic,
  showTranslation,
  showTransliteration,
  sounding,
  selected,
  registerRef,
  onSelect,
}: {
  ayah: AyahData;
  index: number;
  arClass: string;
  arFontPx: number;
  showArabic: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  sounding: boolean;
  selected: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !menuButtonRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const copyArabic = () => {
    void navigator.clipboard?.writeText(ayah.ar);
    closeMenu();
  };

  return (
    <div
      ref={registerRef}
      onClick={onSelect}
      className={`group relative scroll-mt-24 cursor-pointer border-b border-line px-3 py-5 transition-colors ${
        sounding ? 'ayah-active' : selected ? 'bg-accent/6 ring-1 ring-accent/30' : 'hover:bg-surface'
      }`}
      data-ayah={index}
    >
      {showArabic && (
        <p className={`${arClass} pr-8 text-right leading-[2.35] text-ink`} dir="rtl" style={{ fontSize: arFontPx }}>
          {ayah.ar}
          <span className="ayah-marker">{index + 1}</span>
        </p>
      )}
      {showTransliteration && ayah.tl && (
        <p className="mt-4 pr-8 text-[14px] italic leading-relaxed text-ink2">
          <span className="mr-1.5 font-semibold not-italic text-accent">{index + 1}.</span>
          {ayah.tl}
        </p>
      )}
      {showTranslation && ayah.tr && (
        <p className="mt-3 pr-8 text-[15px] leading-relaxed text-ink2">
          <span className="mr-1.5 font-semibold text-accent">{index + 1}.</span>
          {ayah.tr}
        </p>
      )}
      <div className="absolute right-1 top-5">
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={`More actions for ayah ${index + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          className="pressable rounded-full p-1.5 text-mut opacity-70 hover:bg-surface2 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Icon name="more" size={18} />
        </button>
        {menuOpen && (
          <div ref={menuRef} className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-line bg-surface p-1 shadow-card">
            <button
              type="button"
              aria-label="Close actions"
              className="absolute right-1 top-1 rounded-full p-1 text-mut hover:bg-surface2 hover:text-ink"
              onClick={closeMenu}
            >
              <Icon name="close" size={15} />
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface2"
              onClick={(event) => {
                event.stopPropagation();
                onSelect();
                closeMenu();
              }}
            >
              <Icon name="play" size={15} /> Play from here
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface2"
              onClick={(event) => {
                event.stopPropagation();
                copyArabic();
              }}
            >
              <Icon name="stack" size={15} /> Copy Arabic
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ sticky bar ============================ */
function ReaderBar({
  backLabel,
  onBack,
  center,
  actions,
  onOptions,
}: {
  backLabel: string;
  onBack: () => void;
  center?: ReactNode;
  actions?: ReactNode;
  onOptions: () => void;
}) {
  return (
    <div className="safe-t sticky top-0 z-30 -mx-4 flex items-center gap-2 border-b border-line bg-base/85 px-4 py-2 backdrop-blur">
      <button
        type="button"
        onClick={onBack}
        className="pressable inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-mut hover:bg-surface2 hover:text-ink"
      >
        <Icon name="back" size={18} />
        {backLabel}
      </button>
      {center ?? <div className="flex-1" />}
      <div className="flex-1" />
      {actions}
      <button
        type="button"
        aria-label="Reader options"
        onClick={onOptions}
        className="pressable rounded-full p-2 text-mut hover:bg-surface2 hover:text-ink"
      >
        <Icon name="settings" size={20} />
      </button>
    </div>
  );
}

function ReaderBottomBar({
  viewMode,
  onViewModeChange,
  isPlaying,
  onPlay,
}: {
  viewMode: 'list' | 'book';
  onViewModeChange: (mode: 'list' | 'book') => void;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  return (
    <div className="safe-b sticky bottom-0 z-20 mt-5 flex items-center justify-between border-t border-line bg-base/90 px-1 py-3 backdrop-blur">
      <div className="flex rounded-xl bg-surface2 p-1">
        {(['list', 'book'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${viewMode === mode ? 'bg-surface text-accent shadow-sm' : 'text-mut'}`}
          >
            <Icon name={mode} size={15} /> {mode}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onPlay}
        aria-label={isPlaying ? 'Pause playback' : 'Play from active ayah'}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-onaccent shadow-card pressable"
      >
        <Icon name={isPlaying ? 'pause' : 'play'} size={21} />
      </button>
    </div>
  );
}

/* ============================ options modal ============================ */
function OptionRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint && <div className="text-xs text-mut">{hint}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-mut">{children}</div>
  );
}

function ReaderOptions({
  open,
  onClose,
  settings,
  dispatch,
}: {
  open: boolean;
  onClose: () => void;
  settings: SettingsState;
  dispatch: ReturnType<typeof useAppDispatch>;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Reader options" size="sm">
      <SectionLabel>Show lines</SectionLabel>
      <div className="divide-y divide-line">
        <OptionRow
          label="Arabic text"
          hint="The original Qur’anic script"
          control={<Toggle checked={settings.showArabic} onChange={(v) => dispatch(setShowArabic(v))} label="Arabic text" />}
        />
        <OptionRow
          label="Transliteration"
          hint="Pronunciation in Latin letters"
          control={
            <Toggle checked={settings.showTransliteration} onChange={(v) => dispatch(setShowTransliteration(v))} label="Transliteration" />
          }
        />
        <OptionRow
          label="English translation"
          hint="Sahih International"
          control={<Toggle checked={settings.showTranslation} onChange={(v) => dispatch(setShowTranslation(v))} label="English translation" />}
        />
      </div>

      <SectionLabel>Arabic script style</SectionLabel>
      <div className="py-2">
        <Segmented
          value={settings.script}
          onChange={(v) => dispatch(setScript(v))}
          options={SCRIPT_STYLES.map((s) => ({ value: s.id, label: s.label }))}
        />
      </div>

      <SectionLabel>Arabic text size</SectionLabel>
      <div className="flex items-center gap-3 py-2">
        <span className="text-xs text-mut">A</span>
        <Slider
          min={1}
          max={3}
          step={0.05}
          value={settings.arabicFontScale}
          onChange={(v) => dispatch(setArabicFontScale(v))}
          ariaLabel="Arabic text size"
        />
        <span className="text-base text-ink">A</span>
      </div>

      <SectionLabel>Reading</SectionLabel>
      <div className="divide-y divide-line">
        <OptionRow
          label="Follow playback"
          hint="Auto-scroll & highlight the ayah being recited"
          control={<Toggle checked={settings.followAudio} onChange={(v) => dispatch(setFollowAudio(v))} label="Follow playback" />}
        />
        <OptionRow
          label="Focus mode"
          hint="Hide the app navigation for a cleaner page"
          control={<Toggle checked={settings.readingMode} onChange={(v) => dispatch(setReadingMode(v))} label="Focus mode" />}
        />
      </div>

      <SectionLabel>Reciter for playback</SectionLabel>
      <div className="py-2">
        <select
          value={settings.defaultReciter}
          onChange={(e) => dispatch(setDefaultReciter(e.target.value))}
          className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
        >
          {RECITERS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} · {r.arabicName}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
}
