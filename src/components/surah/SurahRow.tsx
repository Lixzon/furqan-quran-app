import { useNavigate } from 'react-router-dom';
import type { SurahMeta } from '../../types';
import { surahNumberToArabic } from '../../lib/utils';
import { Icon, type IconName } from '../ui/Icon';

interface SurahRowProps {
  meta: SurahMeta;
  /** optional leading slot content (e.g. juz/section marker) */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** when provided, clicking the row plays instead of navigating */
  onPlay?: () => void;
  showPlay?: boolean;
  isActive?: boolean;
  playState?: 'playing' | 'paused';
}

export function SurahRow({ meta, leading, trailing, onPlay, showPlay = false, isActive, playState }: SurahRowProps) {
  const navigate = useNavigate();

  const rightIcon: IconName = playState === 'playing' ? 'pause' : 'play';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => (onPlay ? onPlay() : navigate(`/surah/${meta.number}`))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (onPlay ? onPlay() : navigate(`/surah/${meta.number}`));
      }}
      className={`pressable flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${
        isActive ? 'border-accent/40 bg-accent/8' : 'border-transparent bg-surface'
      }`}
    >
      {leading}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 font-semibold text-accent">
        <span className="text-[15px]">{surahNumberToArabic(meta.number)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-semibold text-ink">{meta.englishName}</span>
          <span className="text-xs text-mut">{meta.numberOfAyahs} āyāt</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-mut">{meta.englishNameTranslation}</span>
          <span className="shrink-0 text-[13px] text-ink2" style={{ direction: 'rtl' }}>
            {meta.name}
          </span>
        </div>
      </div>
      {trailing}
      {showPlay && (
        <button
          type="button"
          aria-label={`Play ${meta.englishName}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.();
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-onaccent shadow pressable"
        >
          <Icon name={rightIcon} size={18} />
        </button>
      )}
    </div>
  );
}
