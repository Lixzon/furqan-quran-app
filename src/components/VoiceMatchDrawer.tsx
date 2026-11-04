import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import { Icon } from './ui/Icon';
import type { VoiceMatchResult } from '../lib/recitationSearch';
import { useAppDispatch, useAppSelector } from '../store';
import {
  closeVoiceMatchDrawer,
  clearVoiceMatchSession,
} from '../store/slices/searchSessionSlice';

export function VoiceMatchDrawer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { matches, activeIndex, isOpen } = useAppSelector((state) => state.searchSession);

  const handleSelect = useCallback(
    (match: VoiceMatchResult) => {
      dispatch(clearVoiceMatchSession());
      navigate(`/surah/${match.surahNumber}?ayah=${match.ayahNumber}&voice=1`);
    },
    [dispatch, navigate],
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
            <div className="text-xs font-semibold text-accent">
              Surah {match.surahNumber} · {match.englishName} · Ayah {match.ayahNumber}
            </div>
            <div dir="rtl" className="mt-2 text-sm text-mut">{match.surahName}</div>
            <div dir="rtl" className="mt-1 text-xl leading-loose text-ink">
              {match.matchedSnippet || match.arabicText}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mut">{match.englishText}</p>
          </button>
        ))}
      </div>
    </Modal>
  );
}
