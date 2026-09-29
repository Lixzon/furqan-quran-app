import { APP_NAME } from '../../lib/constants';
import { useAppSelector } from '../../store';
import { Icon } from '../ui/Icon';
import { MihrabLogo } from '../ui/MihrabLogo';
import { StreakHub } from '../ui/StreakHub';
import { useVoiceSearch } from '../search/VoiceSearchModal';

/**
 * Sticky top bar. The app identity only appears on small screens, where the
 * sidebar is not visible; the streak hub always sits at the right end.
 *
 * Hidden in reading mode, matching the sidebar and bottom nav, so the reader
 * keeps the full viewport.
 */
export function TopBar() {
  const readingMode = useAppSelector((s) => s.settings.readingMode);
  const voiceSearch = useVoiceSearch();
  if (readingMode) return null;

  return (
    <header className="safe-t sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2 md:hidden">
          <MihrabLogo size={28} />
          <span className="text-sm font-bold text-ink">{APP_NAME}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={voiceSearch.open}
            aria-label="Find a verse by reciting"
            title="Find a verse by reciting"
            className="pressable inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-mut hover:text-ink"
          >
            <Icon name="mic" size={16} className="text-accent" />
            <span className="hidden sm:inline">Recite</span>
          </button>
          <StreakHub />
        </div>
      </div>
    </header>
  );
}
