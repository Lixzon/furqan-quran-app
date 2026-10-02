import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLayoutEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useAppDispatch, useAppSelector } from '../store';
import { player } from '../audio/controller';
import { getIndoPakSurah, getSurah } from '../lib/dataClient';
import { useQuran } from '../data/QuranProvider';
import { rememberRead } from '../store/slices/progressSlice';
import { toggleAyahBookmark } from '../store/slices/bookmarksSlice';
import type { AyahBookmark } from '../store/slices/bookmarksSlice';
import {
  setArabicFontSize,
  setReadingMode,
  setShowArabic,
  setShowTransliteration,
  setShowTranslation,
  setShowVerseNumbers,
} from '../store/slices/settingsSlice';
import { setAccentColor, setThemeMode } from '../store/slices/settingsSlice';
import { ACCENTS, scriptClassName } from '../lib/constants';
import { isThemeSelectable } from '../lib/unlocks';
import { clamp } from '../lib/utils';
import { Icon } from '../components/ui/Icon';
import { Slider, Toggle } from '../components/ui/controls';
import { Modal } from '../components/ui/Modal';
import { SurahArtwork } from '../components/ui/SurahArtwork';
import { ErrorBlock, SkeletonRows } from '../components/ui/common';
import type { AyahData, SettingsState, SurahFull, ThemeMode } from '../types';

export default function SurahReader() {
  const { number } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const surahNumber = Number(number);

  const settings = useAppSelector((s) => s.settings);
  const playerState = useAppSelector((s) => s.player);
  const bookmarkItems = useAppSelector((s) => s.bookmarks.items);
  const bookmarkIds = useMemo(() => new Set(bookmarkItems.map((item) => item.id)), [bookmarkItems]);
  const lastRead = useAppSelector((s) => s.progress.lastRead[surahNumber]);
  const { surahs, juz } = useQuran();

  const [surah, setSurah] = useState<SurahFull | null>(null);
  const [indoPakAyahs, setIndoPakAyahs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [activeAyah, setActiveAyah] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'book'>('list');
  const [bookPage, setBookPage] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!surah || settings.scriptType !== 'indopak') {
      setIndoPakAyahs([]);
      return () => { alive = false; };
    }
    void getIndoPakSurah(surah.number)
      .then((data) => {
        if (alive) setIndoPakAyahs(data.ayahs.map((ayah) => ayah.text));
      })
      .catch(() => {
        if (alive) setIndoPakAyahs([]);
      });
    return () => { alive = false; };
  }, [surah?.number, settings.scriptType]);

  const validSurahNumber = Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114;

  const refs = useRef(new Map<number, HTMLDivElement>());
  const listRef = useRef<HTMLDivElement>(null);
  const pendingAyahScroll = useRef<{ index: number; smooth: boolean } | null>(null);
  const [listOffset, setListOffset] = useState(0);
  const listSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const initTarget = useRef<number | null>(null);
  const bookPageRef = useRef(0);

  const rowVirtualizer = useWindowVirtualizer({
    count: viewMode === 'list' ? surah?.ayahs.length ?? 0 : 0,
    estimateSize: () => settings.showArabic
      ? Math.max(150, settings.arabicFontSize * settings.lineSpacing * 4)
      : Math.max(100, settings.translationFontSize * settings.lineSpacing * 4),
    overscan: 3,
    scrollMargin: listOffset,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  useLayoutEffect(() => {
    if (viewMode !== 'list' || !listRef.current) return;
    const measureOffset = () => {
      const node = listRef.current;
      if (node) setListOffset(node.getBoundingClientRect().top + window.scrollY);
    };
    measureOffset();
    window.addEventListener('resize', measureOffset);
    return () => window.removeEventListener('resize', measureOffset);
  }, [surah?.number, settings.showArabic, settings.showTranslation, settings.showTransliteration, viewMode]);

  useEffect(() => {
    const pending = pendingAyahScroll.current;
    if (!pending) return;
    const element = refs.current.get(pending.index);
    if (!element) return;
    pendingAyahScroll.current = null;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: pending.smooth && !reduceMotion ? 'smooth' : 'auto', block: 'start' });
  }, [virtualRows]);

  useEffect(() => {
    document.documentElement.style.setProperty('--q-reader-bar-h', '64px');
    return () => {
      document.documentElement.style.removeProperty('--q-reader-bar-h');
    };
  }, []);

  const updateBookPage = useCallback((page: number) => {
    bookPageRef.current = page;
    setBookPage(page);
  }, []);

  const pages = useMemo(() => {
    if (!surah) return [];
    const capacity = settings.showArabic ? 8 : 12;
    const lineWeight = (ayah: AyahData) => {
      let weight = settings.showArabic ? 1.6 + ayah.ar.length / 140 : 0;
      if (settings.showTransliteration && ayah.tl) weight += 1 + ayah.tl.length / 180;
      if (settings.showTranslation && ayah.tr) weight += 1 + ayah.tr.length / 220;
      return Math.max(1, weight);
    };
    const result: number[][] = [];
    let current: number[] = [];
    let used = 0;
    surah.ayahs.forEach((ayah, index) => {
      const weight = lineWeight(ayah);
      if (current.length > 0 && used + weight > capacity) {
        result.push(current);
        current = [];
        used = 0;
      }
      current.push(index);
      used += weight;
    });
    if (current.length > 0) result.push(current);
    return result;
  }, [surah, settings.showArabic, settings.showTransliteration, settings.showTranslation]);

  const pageForAyah = useCallback(
    (index: number) => Math.max(0, pages.findIndex((page) => page.includes(index))),
    [pages],
  );

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
    updateBookPage(pageForAyah(start));
  }, [surah?.number]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToAyah = useCallback(
    (index: number, smooth: boolean) => {
      const el = refs.current.get(index);
      if (!el) {
        pendingAyahScroll.current = { index, smooth };
        rowVirtualizer.scrollToIndex(index, { align: 'start', behavior: 'auto' });
        return;
      }
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: smooth && !reduceMotion ? 'smooth' : 'auto', block: 'start' });
    },
    [rowVirtualizer],
  );

  /**
   * Auto-scroll waits a beat before moving: the highlight updates instantly,
   * then the viewport follows the same index. Coalescing the hops means a
   * skipped or retimed verse does not leave two smooth scrolls fighting, and a
   * boundary crossed twice in quick succession only scrolls once.
   */
  const followScrollTimer = useRef<number | null>(null);
  const scheduleFollowScroll = useCallback(
    (index: number) => {
      if (followScrollTimer.current !== null) window.clearTimeout(followScrollTimer.current);
      followScrollTimer.current = window.setTimeout(() => {
        followScrollTimer.current = null;
        scrollToAyah(index, true);
      }, settings.autoScrollSpeed);
    },
    [scrollToAyah, settings.autoScrollSpeed],
  );

  useEffect(
    () => () => {
      if (followScrollTimer.current !== null) window.clearTimeout(followScrollTimer.current);
    },
    [],
  );

  // One-time scroll to the resume target after first paint. An ayah requested
  // through the URL (search, juz jump) is scrolled to smoothly.
  useEffect(() => {
    if (initTarget.current === null) return;
    if (initTarget.current === activeAyah) {
      const t = initTarget.current;
      initTarget.current = null;
      const raf = requestAnimationFrame(() => scrollToAyah(t, fromUrl !== null));
      return () => cancelAnimationFrame(raf);
    }
  }, [activeAyah, scrollToAyah, surah?.number]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only the ?ayah target changed (e.g. a second voice-search result in the same
  // surah): the surah itself did not reload, so scroll manually.
  useEffect(() => {
    if (!surah || fromUrl === null || initTarget.current !== null) return;
    const target = clamp(fromUrl - 1, 0, surah.ayahs.length - 1);
    setActiveAyah(target);
    if (viewMode === 'book') updateBookPage(pageForAyah(target));
    else requestAnimationFrame(() => scrollToAyah(target, true));
  }, [fromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (viewMode === 'book') updateBookPage(pageForAyah(ayah));
      else scheduleFollowScroll(ayah);
    }
  }, [playerState.ayah, playerState.surah, playerState.isPlaying, settings.followAudio, activeAyah, pageForAyah, updateBookPage, viewMode, surah?.number, scheduleFollowScroll]);

  const isActiveSession = playerState.surah === surahNumber;
  const readerRepeat = isActiveSession ? playerState.repeat : 'off';
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

  const changeViewMode = (mode: 'list' | 'book') => {
    if (mode === 'book') updateBookPage(pageForAyah(activeAyah));
    setViewMode(mode);
  };

  const turnPage = (direction: -1 | 1) => {
    const nextPage = bookPageRef.current + direction;
    if (nextPage >= 0 && nextPage < pages.length) {
      updateBookPage(nextPage);
      return;
    }
    if (direction > 0 && surahNumber < 114) {
      navigate(`/surah/${surahNumber + 1}?ayah=1`);
    } else if (direction < 0 && surahNumber > 1) {
      const previous = surahs?.find((item) => item.number === surahNumber - 1);
      navigate(`/surah/${surahNumber - 1}?ayah=${previous?.numberOfAyahs ?? 1}`);
    }
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

  const arFontPx = settings.arabicFontSize;
  const arClass = scriptClassName(settings.script);
  const showBasmala = surah.number !== 1 && surah.number !== 9;

  return (
    <div className="page-enter">
      {/* sticky toolbar */}
      <ReaderBar
        backLabel="Qur’an"
        onBack={() => navigate('/')}
        center={
          <label className="flex min-w-0 max-w-full items-center justify-center gap-1 text-sm font-semibold text-ink">
            <select
              value={surah.number}
              onChange={(event) => navigate(`/surah/${event.target.value}`)}
              aria-label="Choose surah"
              className="max-w-[10rem] truncate appearance-none bg-transparent text-center text-sm font-semibold text-ink focus:outline-none"
              style={{ textOverflow: 'ellipsis' }}
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
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              aria-label="Toggle translation and transliteration"
              title="Show or hide translation lines"
              onClick={handleQuickVisibility}
              className={`pressable flex h-10 w-10 items-center justify-center rounded-full p-2 transition-colors ${settings.showTranslation || settings.showTransliteration ? 'bg-accent/15 text-accent' : 'text-mut hover:bg-surface2'}`}
            >
              <Icon name={settings.showTranslation || settings.showTransliteration ? 'eye' : 'eyeOff'} size={20} />
            </button>
            <button
              type="button"
              onClick={() => changeViewMode(viewMode === 'list' ? 'book' : 'list')}
              aria-label={`Switch to ${viewMode === 'list' ? 'book' : 'list'} view`}
              title={`${viewMode === 'list' ? 'Book' : 'List'} view`}
              className={`pressable flex h-10 w-10 items-center justify-center rounded-full p-2 transition-colors ${viewMode === 'list' ? 'text-mut hover:bg-surface2' : 'bg-accent/15 text-accent'}`}
            >
              <Icon name={viewMode === 'list' ? 'list' : 'book'} size={20} />
            </button>
          </div>
        }
      />

      <div className="reader-surah-hero relative mt-3 mb-3 overflow-hidden rounded-3xl border border-line bg-surface/70 px-4 py-3 text-center shadow-card backdrop-blur-sm">
        <SurahArtwork surah={surah.number} className="opacity-70" />
        <div className="relative">
        <div className="text-xs font-medium uppercase tracking-widest text-mut">
          Juz {currentJuz?.juz ?? '—'} · {surah.englishName}
        </div>
        <div className="mt-1 text-xs text-mut">{surah.revelationType} · {surah.numberOfAyahs} āyāt</div>
        <div className={`${arClass} mt-3 text-4xl font-semibold text-ink`} style={{ direction: 'rtl' }}>
          {surah.name}
        </div>
        <div className="mt-1 text-sm text-mut">{surah.englishNameTranslation}</div>
        {showBasmala && (
          <div className={`${arClass} mt-4 text-2xl leading-loose text-ink2`} style={{ direction: 'rtl' }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
        )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div
          ref={listRef}
          className="mt-2 touch-pan-y"
          style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' || (event.target as HTMLElement).closest('button')) return;
            listSwipeStart.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = listSwipeStart.current;
            listSwipeStart.current = null;
            if (!start) return;
            const deltaX = event.clientX - start.x;
            const deltaY = event.clientY - start.y;
            if (Math.abs(deltaX) < 72 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
            turnPage(deltaX < 0 ? 1 : -1);
          }}
          onPointerCancel={() => { listSwipeStart.current = null; }}
        >
          {virtualRows.map((virtualRow) => {
            const i = virtualRow.index;
            const ayah = surah.ayahs[i];
            return (
              <AyahBlock
                key={ayah.g}
                virtualIndex={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                }}
                ayah={ayah}
                arabicText={settings.scriptType === 'indopak' ? indoPakAyahs[i] ?? ayah.ar : ayah.ar}
                index={i}
                bookmark={{ id: `${surah.number}:${ayah.i}`, surah: surah.number, ayah: ayah.i, surahName: surah.englishName, arabic: settings.scriptType === 'indopak' ? indoPakAyahs[i] ?? ayah.ar : ayah.ar, translation: ayah.tr }}
                isBookmarked={bookmarkIds.has(`${surah.number}:${ayah.i}`)}
                onToggleBookmark={(item) => dispatch(toggleAyahBookmark(item))}
                arClass={arClass}
                arFontPx={arFontPx}
                showArabic={settings.showArabic}
                showTranslation={settings.showTranslation}
                showTransliteration={settings.showTransliteration}
                showVerseNumbers={settings.showVerseNumbers}
                translationFontSize={settings.translationFontSize}
                lineSpacing={settings.lineSpacing}
                sounding={isActiveSession && playerState.isPlaying && playerState.ayah === i}
                selected={activeAyah === i}
                registerRef={(el) => {
                  if (el) refs.current.set(i, el);
                  else refs.current.delete(i);
                  rowVirtualizer.measureElement(el);
                }}
                onSelect={() => handleSelect(i)}
              />
            );
          })}
        </div>
      ) : (
        <BookView
          pages={pages}
          pageIndex={bookPage}
          surah={surah}
          arClass={arClass}
          arFontPx={arFontPx}
          showArabic={settings.showArabic}
          showTranslation={settings.showTranslation}
          showTransliteration={settings.showTransliteration}
          showVerseNumbers={settings.showVerseNumbers}
          translationFontSize={settings.translationFontSize}
          lineSpacing={settings.lineSpacing}
          scriptType={settings.scriptType}
          indoPakAyahs={indoPakAyahs}
          isActiveSession={isActiveSession}
          isPlaying={playerState.isPlaying}
          activeAyah={activeAyah}
          onSelect={handleSelect}
          bookmarkedIds={bookmarkIds}
          onToggleBookmark={(item) => dispatch(toggleAyahBookmark(item))}
          onTurn={turnPage}
        />
      )}

      <ReaderBottomBar
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
        hasActiveSession={playerState.surah !== null}
        readingMode={settings.readingMode}
        onPlay={handlePlay}
        repeat={readerRepeat}
        shuffle={playerState.mode === 'shuffle'}
        onRepeat={() => {
          const next = readerRepeat === 'off' ? 'one' : readerRepeat === 'one' ? 'all' : 'off';
          player.setRepeat(next);
        }}
        onShuffle={() => player.setMode(playerState.mode === 'shuffle' ? 'order' : 'shuffle')}
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
  arabicText,
  index,
  bookmark,
  isBookmarked,
  onToggleBookmark,
  arClass,
  arFontPx,
  showArabic,
  showTranslation,
  showTransliteration,
  showVerseNumbers,
  translationFontSize,
  lineSpacing,
  sounding,
  selected,
  registerRef,
  onSelect,
  virtualIndex,
  style,
}: {
  ayah: AyahData;
  arabicText?: string;
  index: number;
  bookmark: Omit<AyahBookmark, 'note' | 'createdAt'>;
  isBookmarked: boolean;
  onToggleBookmark: (bookmark: Omit<AyahBookmark, 'note' | 'createdAt'>) => void;
  arClass: string;
  arFontPx: number;
  showArabic: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  showVerseNumbers: boolean;
  translationFontSize: number;
  lineSpacing: number;
  sounding: boolean;
  selected: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  virtualIndex?: number;
  style?: React.CSSProperties;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayedArabic = arabicText ?? ayah.ar;

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
    void navigator.clipboard?.writeText(displayedArabic);
    closeMenu();
  };

  return (
    <div
      ref={registerRef}
      data-index={virtualIndex}
      onClick={onSelect}
      style={style}
      className={`ayah-row group relative scroll-mt-24 cursor-pointer border-b border-line px-3 py-5 transition-colors ${
        sounding ? 'ayah-active' : selected ? 'bg-accent/6 ring-1 ring-accent/30' : 'hover:bg-surface'
      }`}
      data-ayah={index}
    >
      {showArabic && (
        <p className={`ayah-ar ${arClass} pr-8 text-right text-ink`} dir="rtl" style={{ fontSize: arFontPx, lineHeight: lineSpacing }}>
          {displayedArabic}
          {showVerseNumbers && <span className="ayah-marker">{index + 1}</span>}
        </p>
      )}
      {showTransliteration && ayah.tl && (
        <p className="ayah-tl mt-4 pr-8 italic text-ink2" style={{ fontSize: Math.min(translationFontSize, 20), lineHeight: lineSpacing }}>
          {showVerseNumbers && <span className="mr-1.5 font-semibold not-italic text-accent">{index + 1}.</span>}
          {ayah.tl}
        </p>
      )}
      {showTranslation && ayah.tr && (
        <p className="ayah-tr mt-3 pr-8 text-ink2" style={{ fontSize: translationFontSize, lineHeight: lineSpacing }}>
          {showVerseNumbers && <span className="mr-1.5 font-semibold text-accent">{index + 1}.</span>}
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
          className="pressable flex h-12 w-12 items-center justify-center rounded-full text-mut hover:bg-surface2 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Icon name="more" size={18} />
        </button>
        {menuOpen && (
          <div ref={menuRef} className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-line bg-surface p-1 shadow-card">
            <button
              type="button"
              aria-label={isBookmarked ? `Remove bookmark for ayah ${index + 1}` : `Bookmark ayah ${index + 1}`}
              aria-pressed={isBookmarked}
              className="flex min-h-12 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface2"
              onClick={(event) => {
                event.stopPropagation();
                onToggleBookmark(bookmark);
                closeMenu();
              }}
            >
              <Icon name="pin" size={16} /> {isBookmarked ? 'Remove bookmark' : 'Bookmark ayah'}
            </button>
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

function BookView({
  pages,
  pageIndex,
  surah,
  arClass,
  arFontPx,
  showArabic,
  showTranslation,
  showTransliteration,
  showVerseNumbers,
  translationFontSize,
  lineSpacing,
  scriptType,
  indoPakAyahs,
  isActiveSession,
  isPlaying,
  activeAyah,
  onSelect,
  bookmarkedIds,
  onToggleBookmark,
  onTurn,
}: {
  pages: number[][];
  pageIndex: number;
  surah: SurahFull;
  arClass: string;
  arFontPx: number;
  showArabic: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  showVerseNumbers: boolean;
  translationFontSize: number;
  lineSpacing: number;
  scriptType: SettingsState['scriptType'];
  indoPakAyahs: string[];
  isActiveSession: boolean;
  isPlaying: boolean;
  activeAyah: number;
  onSelect: (index: number) => void;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (bookmark: Omit<AyahBookmark, 'note' | 'createdAt'>) => void;
  onTurn: (direction: -1 | 1) => void;
}) {
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onTurn(1);
      if (event.key === 'ArrowRight') onTurn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTurn]);

  const page = pages[pageIndex] ?? [];
  return (
    <div className="mt-2">
      <div
        className="relative touch-pan-y overflow-hidden rounded-2xl border border-line bg-surface px-3 py-2 shadow-card"
        onPointerDown={(event) => {
          dragStart.current = event.clientX;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          if (dragStart.current === null) return;
          const delta = event.clientX - dragStart.current;
          dragStart.current = null;
          if (Math.abs(delta) < 40) return;
          onTurn(delta < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
      >
        <div key={pageIndex} className="anim-fade min-h-[55vh]">
          {page.map((index) => {
            const ayah = surah.ayahs[index];
            return (
              <AyahBlock
                key={ayah.g}
                ayah={ayah}
                arabicText={scriptType === 'indopak' ? indoPakAyahs[index] ?? ayah.ar : ayah.ar}
                index={index}
                bookmark={{ id: `${surah.number}:${ayah.i}`, surah: surah.number, ayah: ayah.i, surahName: surah.englishName, arabic: scriptType === 'indopak' ? indoPakAyahs[index] ?? ayah.ar : ayah.ar, translation: ayah.tr }}
                isBookmarked={bookmarkedIds.has(`${surah.number}:${ayah.i}`)}
                onToggleBookmark={onToggleBookmark}
                arClass={arClass}
                arFontPx={arFontPx}
                showArabic={showArabic}
                showTranslation={showTranslation}
                showTransliteration={showTransliteration}
                showVerseNumbers={showVerseNumbers}
                translationFontSize={translationFontSize}
                lineSpacing={lineSpacing}
                sounding={isActiveSession && isPlaying && activeAyah === index}
                selected={activeAyah === index}
                registerRef={() => undefined}
                onSelect={() => onSelect(index)}
              />
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onTurn(-1)}
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface2/80 text-mut hover:text-ink"
        >
          <Icon name="chevronRight" size={16} className="rotate-180" />
        </button>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onTurn(1)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface2/80 text-mut hover:text-ink"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
      <div className="mt-2 text-center text-xs text-mut">Page {Math.min(pageIndex + 1, pages.length)} of {pages.length}</div>
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
    <div className="safe-t sticky top-0 z-30 -mx-4 flex items-center gap-2 border-b border-line bg-canvas/85 px-4 py-2 backdrop-blur">
      <button
        type="button"
        onClick={onBack}
        className="pressable inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-mut hover:bg-surface2 hover:text-ink"
      >
        <Icon name="back" size={18} />
        {backLabel}
      </button>
      <div className="min-w-0 flex-1 text-center">
        {center ?? <div className="h-5 w-full" />}
      </div>
      {actions}
      <button
        type="button"
        aria-label="Reading settings"
        onClick={onOptions}
        className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-2 text-mut transition-colors hover:bg-surface2 hover:text-ink"
      >
        <Icon name="settings" size={20} />
      </button>
    </div>
  );
}

function ReaderBottomBar({
  viewMode,
  onViewModeChange,
  hasActiveSession,
  readingMode,
  onPlay,
  repeat,
  shuffle,
  onRepeat,
  onShuffle,
}: {
  viewMode: 'list' | 'book';
  onViewModeChange: (mode: 'list' | 'book') => void;
  hasActiveSession: boolean;
  readingMode: boolean;
  onPlay: () => void;
  repeat: 'off' | 'one' | 'all';
  shuffle: boolean;
  onRepeat: () => void;
  onShuffle: () => void;
}) {
  return (
    <div className={`reader-pill-position pointer-events-none ${readingMode ? 'reader-pill-position-reading' : ''}`}>
      <div className="pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-2 rounded-full border border-line/60 bg-surface/85 px-2 py-2 shadow-card backdrop-blur-xl">
        <div className="flex rounded-full bg-surface2 p-1">
          {(['list', 'book'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              aria-pressed={viewMode === mode}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold capitalize ${viewMode === mode ? 'bg-accent/15 text-accent' : 'text-mut'}`}
            >
              <Icon name={mode} size={15} /> {mode}
            </button>
          ))}
        </div>
        <span aria-hidden="true" className="h-6 w-px bg-line" />
        <button type="button" onClick={onShuffle} aria-label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} title={shuffle ? 'Shuffle on' : 'Shuffle off'} aria-pressed={shuffle} className={`pressable rounded-full p-2 ${shuffle ? 'bg-accent/15 text-accent' : 'text-mut hover:bg-surface2'}`}>
          <Icon name="shuffle" size={18} />
        </button>
        <button type="button" onClick={onRepeat} aria-label={`Repeat ${repeat}`} title={`Repeat ${repeat}`} aria-pressed={repeat !== 'off'} className={`pressable rounded-full p-2 ${repeat !== 'off' ? 'bg-accent/15 text-accent' : 'text-mut hover:bg-surface2'}`}>
          <Icon name={repeat === 'one' ? 'repeatOne' : 'repeat'} size={18} />
        </button>
        {!hasActiveSession && (
          <button
            type="button"
            onClick={onPlay}
            aria-label="Play from active ayah"
            title="Play"
            className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-accent text-onaccent shadow-card"
          >
            <Icon name="play" size={19} />
          </button>
        )}
      </div>
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
  const theme = useAppSelector((state) => state.theme);
  const streak = useAppSelector((state) => state.progress.progression.currentStreak);
  const navigate = useNavigate();
  const allPreviews: { mode: ThemeMode; label: string; background: string; surface: string; ink: string; muted: string; line: string }[] = [
    { mode: 'light', label: 'Light', background: '#f1f6f3', surface: '#ffffff', ink: '#142520', muted: '#6d7d77', line: '#dbe6e1' },
    { mode: 'dark', label: 'Dark', background: '#0a120f', surface: '#101d19', ink: '#e9f1ee', muted: '#8ba09a', line: '#1f332c' },
    { mode: 'system', label: 'Auto', background: 'linear-gradient(135deg, #f1f6f3 0 49%, #101d19 51% 100%)', surface: '#ffffff', ink: '#142520', muted: '#6d7d77', line: '#dbe6e1' },
    { mode: 'sepia', label: 'Sepia', background: '#f2e7cf', surface: '#fbf3e3', ink: '#3b3022', muted: '#786b58', line: '#d6c6a8' },
    { mode: 'midnight', label: 'Midnight', background: '#070f1d', surface: '#0d1a2e', ink: '#e6eefb', muted: '#8296b8', line: '#1b2c48' },
    { mode: 'emerald', label: 'Emerald', background: '#eaf4ec', surface: '#f7fcf8', ink: '#10241a', muted: '#5f7a66', line: '#cfe4d5' },
  ];
  // The gated reading themes only appear once the 100-day milestone is held,
  // unless one of them is the theme already in use.
  const previews = allPreviews.filter((preview) =>
    isThemeSelectable(preview.mode, streak, theme.mode === preview.mode),
  );

  return (
    <Modal open={open} onClose={onClose} title="Reading settings" variant="frosted">
      <SectionLabel>Appearance</SectionLabel>
      <div className="grid grid-cols-2 gap-2 py-2">
        {previews.map((preview) => {
          const selected = theme.mode === preview.mode;
          return (
            <button
              key={preview.mode}
              type="button"
              aria-pressed={selected}
              onClick={() => dispatch(setThemeMode(preview.mode))}
              className={`relative min-w-0 rounded-xl border p-1.5 text-left ${selected ? 'border-accent ring-2 ring-accent/40' : 'border-line'}`}
            >
              <div className="flex aspect-[4/5] flex-col overflow-hidden rounded-lg p-1.5" style={{ background: preview.background, color: preview.ink }}>
                <div className="flex-1 rounded-md border p-1.5" style={{ backgroundColor: preview.surface, borderColor: preview.line }}>
                  <div dir="rtl" className="text-[9px] leading-relaxed">بِسْمِ اللَّهِ الرَّحْمَٰنِ</div>
                  <div className="mt-1 h-1 rounded-full" style={{ backgroundColor: preview.muted, opacity: 0.5 }} />
                  <div className="mt-1 h-1 w-4/5 rounded-full" style={{ backgroundColor: preview.muted, opacity: 0.35 }} />
                </div>
              </div>
              <span className="mt-1 block text-center text-[11px] font-medium text-ink">{preview.label}</span>
              {selected && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-onaccent"><Icon name="check" size={12} /></span>}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <SectionLabel>Accent</SectionLabel>
        <div className="flex items-center gap-2">
          {ACCENTS.map((accent) => {
            const selected = theme.accent === accent.id;
            return (
              <button
                key={accent.id}
                type="button"
                aria-label={`${accent.label} accent`}
                aria-pressed={selected}
                title={accent.label}
                onClick={() => dispatch(setAccentColor(accent.id))}
                className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-surface2"
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`} style={{ backgroundColor: accent.swatch }}>
                  {selected && <Icon name="check" size={14} className="text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <SectionLabel>Arabic font size · {settings.arabicFontSize}px</SectionLabel>
      <div className="py-2">
        <Slider min={18} max={50} step={1} value={settings.arabicFontSize} onChange={(value) => dispatch(setArabicFontSize(value))} ariaLabel="Arabic font size" />
      </div>
      <div className="overflow-hidden rounded-xl bg-surface2 px-3 py-2 text-center text-ink" dir="rtl">
        <span className="ar-uthmani" style={{ fontSize: settings.arabicFontSize, lineHeight: settings.lineSpacing }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
      </div>

      <SectionLabel>Show lines</SectionLabel>
      <div className="divide-y divide-line">
        <OptionRow label="Arabic" control={<Toggle checked={settings.showArabic} onChange={(value) => dispatch(setShowArabic(value))} label="Arabic" />} />
        <OptionRow label="Transliteration" control={<Toggle checked={settings.showTransliteration} onChange={(value) => dispatch(setShowTransliteration(value))} label="Transliteration" />} />
        <OptionRow label="Translation" control={<Toggle checked={settings.showTranslation} onChange={(value) => dispatch(setShowTranslation(value))} label="Translation" />} />
        <OptionRow label="Verse numbers" control={<Toggle checked={settings.showVerseNumbers} onChange={(value) => dispatch(setShowVerseNumbers(value))} label="Verse numbers" />} />
        <OptionRow label="Focus mode" control={<Toggle checked={settings.readingMode} onChange={(value) => dispatch(setReadingMode(value))} label="Focus mode" />} />
      </div>

      <button type="button" onClick={() => { onClose(); navigate('/settings'); }} className="mt-3 w-full border-t border-line pt-3 text-left text-sm font-semibold text-accent">
        More settings <Icon name="forward" size={15} className="ml-1 inline" />
      </button>
    </Modal>
  );
}
