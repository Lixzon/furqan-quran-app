import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { player } from '../../audio/controller';
import { useQuran } from '../../data/QuranProvider';
import { formatTime, surahNumberToArabic } from '../../lib/utils';
import { reciterById } from '../../lib/constants';
import { Icon } from '../ui/Icon';
import { SurahArtwork } from '../ui/SurahArtwork';

/** Dockable mini player bar shown above the bottom navigation. */
export function MiniPlayer() {
  const p = useAppSelector((s) => s.player);
  const readingMode = useAppSelector((s) => s.settings.readingMode);
  const quran = useQuran();
  const navigate = useNavigate();
  const location = useLocation();

  const surah = p.surah;
  const meta = surah ? quran.surahById(surah) : undefined;
  if (!surah || !meta) return null;

  const reciter = reciterById(p.reciter);
  const progress = p.duration > 0 ? Math.min(100, (p.currentTime / p.duration) * 100) : 0;
  const isReader = location.pathname === `/surah/${surah}`;
  const positionClass = isReader
    ? readingMode ? 'mini-player-reader-reading' : 'mini-player-reader'
    : readingMode ? 'mini-player-reading' : 'mini-player-default';
  const title = p.ayah === null ? meta.englishName : `${meta.englishName} ${surah}:${p.ayah + 1}`;

  return (
    <div
      className={`mini-player-position pointer-events-none fixed inset-x-0 z-40 md:left-60 ${positionClass}`}
    >
      <div
        onClick={() => navigate('/player')}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            navigate('/player');
          }
        }}
        className="mini-player-capsule anim-fade-up pointer-events-auto relative mx-auto flex w-[calc(100%-24px)] max-w-2xl cursor-pointer items-center gap-2 overflow-hidden rounded-3xl border border-line/60 bg-surface/80 px-3 py-2.5 shadow-card backdrop-blur-xl sm:gap-3"
        role="button"
        tabIndex={0}
        aria-label={`Open player for ${title}`}
      >
        <div className="mini-player-artwork relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface2 text-accent">
          <SurahArtwork surah={surah} className="opacity-90" />
          <span className="relative text-sm font-semibold">{surahNumberToArabic(surah)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{title}</div>
          <div className="truncate text-[11px] text-mut">
            {p.isPlaying ? (
              <span className="inline-flex items-center gap-1.5 text-accent">
                <span className="eq"><span /><span /><span /></span>
                {reciter.label}
              </span>
            ) : <span>Paused · {reciter.label}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
          {!isReader && (
            <button type="button" aria-label={`View text for ${meta.englishName}`} title="View text" className="pressable rounded-full p-1.5 text-mut hover:bg-surface2 hover:text-ink" onClick={() => navigate(`/surah/${surah}`)}>
              <Icon name="book" size={18} />
            </button>
          )}
          <button type="button" aria-label={`Playback speed ${p.playbackRate} times`} title="Change playback speed" onClick={() => player.cyclePlaybackRate()} className="pressable rounded-full bg-surface2 px-2 py-1.5 text-[11px] font-semibold tabular-nums text-ink">
            {p.playbackRate}x
          </button>
          <button type="button" aria-label="Previous surah" title="Previous surah" className="pressable rounded-full p-1.5 text-mut hover:bg-surface2" onClick={() => player.previous()}>
            <Icon name="prev" size={19} />
          </button>
          <button type="button" aria-label={p.isPlaying ? 'Pause playback' : 'Play playback'} title={p.isPlaying ? 'Pause' : 'Play'} className="pressable flex h-11 w-11 items-center justify-center rounded-full bg-accent text-onaccent shadow-card" onClick={() => player.togglePlay()}>
            <Icon name={p.isPlaying ? 'pause' : 'play'} size={20} />
          </button>
          <button type="button" aria-label="Next surah" title="Next surah" className="pressable rounded-full p-1.5 text-mut hover:bg-surface2" onClick={() => player.next()}>
            <Icon name="next" size={19} />
          </button>
          <button type="button" aria-label="Close player" title="Stop playback and close player" className="pressable rounded-full p-1.5 text-mut hover:bg-surface2 hover:text-danger" onClick={() => player.stop()}>
            <Icon name="close" size={17} />
          </button>
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full bg-surface2">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

/** Thin progress text helper (shared). */
export function useTimeHelpers() {
  return { formatTime };
}
