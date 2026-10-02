import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import { Icon } from './ui/Icon';
import type { VoiceMatchResult } from '../lib/recitationSearch';
import { useAppDispatch, useAppSelector } from '../store';
import {
  closeVoiceMatchDrawer,
  openVoiceMatchDrawer,
  setActiveVoiceMatchIndex,
} from '../store/slices/searchSessionSlice';

export function VoiceMatchDrawer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { matches, activeIndex, isOpen } = useAppSelector((state) => state.searchSession);

  const handleSelect = useCallback(
    (match: VoiceMatchResult) => {
      dispatch(setActiveVoiceMatchIndex(matches.findIndex((item) => item.surahNumber === match.surahNumber && item.ayahNumber === match.ayahNumber)));
      navigate(`/surah/${match.surahNumber}?ayah=${match.ayahNumber}&voice=1`);
      dispatch(closeVoiceMatchDrawer());
    },
    [dispatch, matches, navigate],
  );

  useEffect(() => {
    if (!isOpen || matches.length !== 1) return;
    handleSelect(matches[0]);
  }, [handleSelect, isOpen, matches]);

  if (!isOpen || matches.length === 0) return null;

  if (matches.length === 1) return null;

  return (
    <Modal open={isOpen} onClose={() => dispatch(closeVoiceMatchDrawer())} size="lg" title={
      <span className="inline-flex items-center gap-2">
        <Icon name="search" size={18} className="text-accent" />
        Matches found
      </span>
    }>
      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-mut">
          {matches.length} results
        </div>
        {matches.map((match, index) => (
          <button
            key={`${match.surahNumber}:${match.ayahNumber}:${index}`}
            type="button"
            onClick={() => handleSelect(match)}
            aria-label={`${match.englishName} surah ${match.surahNumber}:${match.ayahNumber}`}
            title={`${match.englishName} surah ${match.surahNumber}:${match.ayahNumber}`}
            className={`pressable w-full rounded-2xl border p-3 text-left ${
              index === activeIndex ? 'border-accent/50 bg-accent/8' : 'border-line bg-surface2/70 hover:border-accent/35'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-mut">
              <span>{match.englishName}</span>
              <span>{match.surahNumber}:{match.ayahNumber}</span>
            </div>
            <div className="mt-2 text-base font-medium text-ink">{match.surahName}</div>
            <div dir="rtl" className="mt-2 text-xl leading-loose text-ink">
              {match.matchedSnippet || match.arabicText}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mut">{match.englishText}</p>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function VoiceMatchBackPill() {
  const dispatch = useAppDispatch();
  const { matches, isOpen } = useAppSelector((state) => state.searchSession);

  if (isOpen || matches.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => dispatch(openVoiceMatchDrawer())}
      className="voice-match-back-pill fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-accent/40 bg-surface/85 px-4 py-2 text-sm font-semibold text-ink shadow-card backdrop-blur-md"
    >
      <span className="inline-flex items-center gap-2">
        <Icon name="back" size={15} />
        Back to Matches
      </span>
    </button>
  );
}
