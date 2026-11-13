import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { useVoiceSearch } from '../search/VoiceSearchModal';
import { QuranSearchModal } from '../search/QuranSearchModal';
import { StreakHub } from '../ui/StreakHub';
import { Icon } from '../ui/Icon';
import { clearSessionFlag } from '../../lib/sessionFlags';
import { SwitchAppsButton } from '../../shared/SectionSwitcher';

export function TopBar() {
  const readingMode = useAppSelector((s) => s.settings.readingMode);
  const location = useLocation();
  const voiceSearch = useVoiceSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  const isMishkaHome = location.pathname === '/' || location.pathname === '/journey';
  const isFurqanHome = location.pathname === '/quran';
  const isHome = isMishkaHome || isFurqanHome;
  return (
    <>
      <header className="safe-t sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-3 py-2 sm:px-4">
          <SwitchAppsButton className={readingMode ? 'md:inline-flex' : 'md:hidden'} />
          {isMishkaHome && !readingMode && (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <StreakHub />
            </div>
          )}
          {isHome && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {!readingMode && <button
                type="button"
                onClick={voiceSearch.open}
                aria-label={voiceSearch.isListening ? 'Voice search is listening' : 'Search by reciting a verse'}
                aria-pressed={voiceSearch.isListening}
                title={voiceSearch.isListening ? 'Listening for a recited verse' : 'Search for a verse by reciting'}
                className={`pressable relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border p-0 transition ${
                  voiceSearch.isListening
                    ? 'mic-header-listening border-fuchsia-300/60 bg-violet-600 text-white'
                    : 'border-line bg-surface2 text-muted hover:text-ink'
                }`}
              >
                <Icon name="mic" size={18} />
              </button>}
              <button
                type="button"
                onClick={() => {
                  clearSessionFlag('quran_search_dismissed_session');
                  setSearchOpen(true);
                }}
                aria-label="Search Quran chapters"
                title="Search Quran chapters in Arabic or English"
                className="pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface2 text-muted transition hover:text-ink"
              >
                <Icon name="search" size={18} />
              </button>
            </div>
          )}
        </div>
      </header>
      {isHome && !readingMode && <QuranSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </>
  );
}
