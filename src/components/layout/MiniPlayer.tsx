import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { player } from '../../audio/controller';
import { useQuran } from '../../data/QuranProvider';
import { formatTime, surahNumberToArabic } from '../../lib/utils';
import { reciterById } from '../../lib/constants';
import { Icon } from '../ui/Icon';

/** Dockable mini player bar shown above the bottom navigation. */
export function MiniPlayer() {
  const p = useAppSelector((s) => s.player);
  const readingMode = useAppSelector((s) => s.settings.readingMode);
  const quran = useQuran();
  const navigate = useNavigate();

  const surah = p.surah;
  const meta = surah ? quran.surahById(surah) : undefined;
  if (!surah || !meta) return null;

  const reciter = reciterById(p.reciter);
  const progress = p.duration > 0 ? Math.min(100, (p.currentTime / p.duration) * 100) : 0;
  const bottom = readingMode ? 0 : 'calc(58px + env(safe-area-inset-bottom, 0px))';

  return (
    <div
      onClick={() => navigate('/player')}
      className="fixed inset-x-0 z-40 cursor-pointer border-t border-line bg-surface/95 backdrop-blur"
      style={{ bottom }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate('/player');
      }}
    >
      {/* progress hairline */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-surface2">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
          <span className="text-base font-semibold">{surahNumberToArabic(surah)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{meta.englishName}</div>
          <div className="truncate text-xs text-mut">
            {p.isPlaying ? (
              <span className="inline-flex items-center gap-1.5 text-accent">
                <span className={`eq ${p.isPlaying ? '' : 'paused'}`}>
                  <span />
                  <span />
                  <span />
                </span>
                {reciter.label}
              </span>
            ) : (
              <span className="text-accent">Paused · {reciter.label}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label={`View text for ${meta.englishName}`}
            title="View text"
            className="pressable rounded-full p-2 text-mut hover:bg-surface2 hover:text-ink"
            onClick={() => navigate(`/surah/${surah}`)}
          >
            <Icon name="book" size={19} />
          </button>
          <button
            type="button"
            aria-label="Previous"
            className="pressable rounded-full p-2 text-mut hover:bg-surface2"
            onClick={() => player.previous()}
          >
            <Icon name="prev" size={20} />
          </button>
          <button
            type="button"
            aria-label={p.isPlaying ? 'Pause' : 'Play'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-onaccent shadow"
            onClick={() => player.togglePlay()}
          >
            <Icon name={p.isPlaying ? 'pause' : 'play'} size={20} />
          </button>
          <button
            type="button"
            aria-label="Next"
            className="pressable rounded-full p-2 text-mut hover:bg-surface2"
            onClick={() => player.next()}
          >
            <Icon name="next" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Thin progress text helper (shared). */
export function useTimeHelpers() {
  return { formatTime };
}
