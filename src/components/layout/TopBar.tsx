import { APP_NAME } from '../../lib/constants';
import { useAppSelector } from '../../store';
import { Icon } from '../ui/Icon';
import { MihrabLogo } from '../ui/MihrabLogo';
import { useVoiceSearch } from '../search/VoiceSearchModal';
import { useNavigate } from 'react-router-dom';

/**
 * Minimal top bar with the app identity and a direct path to the profile page.
 * The mic action stays available for the Recite flow, while the streak and
 * settings pills are intentionally kept off the global header.
 */
export function TopBar() {
  const readingMode = useAppSelector((s) => s.settings.readingMode);
  const navigate = useNavigate();
  const voiceSearch = useVoiceSearch();
  if (readingMode) return null;

  return (
    <header className="safe-t sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2">
          <MihrabLogo size={28} />
          <span className="text-sm font-bold text-ink">{APP_NAME}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={voiceSearch.open}
            aria-label="Recite and find the verse by speech"
            title="Recite: find a verse by listening to it"
            className="pressable flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent p-2 text-mut transition-colors hover:bg-surface2 hover:text-ink"
          >
            <Icon name="mic" size={18} className="text-accent" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Open profile"
            className="pressable flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent p-2 text-muted transition-colors hover:bg-surface2 hover:text-ink"
          >
            <Icon name="user" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
