import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { EmptyState } from '../ui/common';
import { useAppDispatch, useAppSelector } from '../../store';
import { scriptClassName } from '../../lib/constants';
import { formatTime } from '../../lib/utils';
import {
  DEFAULT_SEARCH_LIMIT,
  loadArabicSearchIndex,
  type ArabicSearchIndex,
} from '../../lib/arabicSearch';
import { subscribeSurahLoad } from '../../lib/dataClient';
import { searchRecitationMatches, type VoiceMatchResult } from '../../lib/recitationSearch';
import { useSpeechRecognition, type SpeechStatus } from '../../services/useSpeechRecognition';
import { clearVoiceMatchSession, setVoiceMatchSession } from '../../store/slices/searchSessionSlice';
import { setVoiceLanguage } from '../../store/slices/settingsSlice';

/* ------------------------------------------------------------------ */
/* provider                                                           */
/* ------------------------------------------------------------------ */

interface VoiceSearchContextValue {
  /** Opens the recitation-search sheet from anywhere in the app. */
  open: () => void;
}

const VoiceSearchContext = createContext<VoiceSearchContextValue | null>(null);

export function useVoiceSearch(): VoiceSearchContextValue {
  const ctx = useContext(VoiceSearchContext);
  if (!ctx) throw new Error('useVoiceSearch must be used inside VoiceSearchProvider');
  return ctx;
}

export function VoiceSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo<VoiceSearchContextValue>(() => ({ open: () => setOpen(true) }), []);
  return (
    <VoiceSearchContext.Provider value={value}>
      {children}
      <VoiceSearchModal open={open} onClose={() => setOpen(false)} />
    </VoiceSearchContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* modal                                                              */
/* ------------------------------------------------------------------ */

const LANGUAGES = [
  { id: 'ar-SA', label: 'Saudi', arabic: 'السعودية' },
  { id: 'ar-EG', label: 'Egyptian', arabic: 'مصر' },
  { id: 'en-US', label: 'English', arabic: 'English' },
] as const;

const SEARCH_DEBOUNCE_MS = 220;

function VoiceSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const script = useAppSelector((s) => s.settings.script);
  const voiceLanguage = useAppSelector((s) => s.settings.voiceLanguage);
  const arClass = scriptClassName(script);

  const [lang, setLang] = useState<string>(voiceLanguage);
  const [index, setIndex] = useState<ArabicSearchIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);
  const [results, setResults] = useState<VoiceMatchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const speech = useSpeechRecognition({
    lang,
    fallbackLang: lang === 'ar-SA' ? 'ar-EG' : 'ar-SA',
  });
  const { status, transcript, cancel: cancelSpeech } = speech;
  const isListening = status === 'listening';
  const isBusy = isListening || status === 'processing';

  useEffect(() => {
    if (open) setLang(voiceLanguage);
  }, [open, voiceLanguage]);

  /* Fetch the whole Qur'an the first time the sheet is opened. */
  useEffect(() => {
    if (!open || index) return;
    let alive = true;
    setLoadError(null);
    const unsubscribe = subscribeSurahLoad((loaded, total) => {
      if (alive && total > 0) setProgress(loaded / total);
    });
    loadArabicSearchIndex()
      .then((built) => {
        if (alive) setIndex(built);
      })
      .catch((error: unknown) => {
        if (alive) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [open, index, reloadTick]);

  /* Match the recognised (or typed) text against the corpus. */
  useEffect(() => {
    const query = transcript.trim();
    if (!index || query.length < 2) {
      setResults([]);
      setSearching(false);
      dispatch(clearVoiceMatchSession());
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const language = lang === 'en-US' ? 'en-US' : 'ar-SA';
        const matches = await searchRecitationMatches(query, language, DEFAULT_SEARCH_LIMIT);
        setResults(matches);
        if (matches.length === 0) {
          dispatch(clearVoiceMatchSession());
          setSearching(false);
          return;
        }
        if (matches.length === 1) {
          const match = matches[0];
          dispatch(setVoiceMatchSession({ matches, activeIndex: 0, isOpen: false, lastQuery: query }));
          setSearching(false);
          cancelSpeech();
          onClose();
          navigate(`/surah/${match.surahNumber}?ayah=${match.ayahNumber}`);
          return;
        }
        onClose();
        dispatch(setVoiceMatchSession({ matches, activeIndex: 0, isOpen: true, lastQuery: query }));
        setSearching(false);
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [cancelSpeech, dispatch, index, lang, navigate, onClose, transcript]);

  const close = useCallback(() => {
    dispatch(clearVoiceMatchSession());
    speech.cancel();
    setResults([]);
    onClose();
  }, [dispatch, onClose, speech]);

  const toggleListening = () => {
    if (isBusy) speech.stop();
    else speech.start();
  };

  const retry = () => {
    speech.cancel();
    speech.start();
  };

  const startOver = () => {
    dispatch(clearVoiceMatchSession());
    speech.cancel();
    setResults([]);
  };

  const chooseLanguage = (id: string) => {
    if (id === lang) return;
    speech.cancel();
    setLang(id);
    dispatch(setVoiceLanguage(id === 'en-US' ? 'en-US' : 'ar-SA'));
  };

  const selectHit = (hit: VoiceMatchResult) => {
    dispatch(setVoiceMatchSession({ matches: [hit], activeIndex: 0, isOpen: false, lastQuery: transcript.trim() }));
    close();
    navigate(`/surah/${hit.surahNumber}?ayah=${hit.ayahNumber}`);
  };

  const ready = index !== null;
  const query = transcript.trim();
  const liveValue = isListening ? transcript || speech.interim : transcript;

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={
        <span className="inline-flex items-center gap-2">
          <Icon name="mic" size={18} className="text-accent" />
          Find a verse by reciting
        </span>
      }
    >
      <div className="space-y-4">
        {/* recognised text input */}
        <div className="rounded-2xl border border-line bg-surface2/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-mut">
              Recognised recitation
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-mut">
              {isBusy ? formatTime(speech.elapsedMs / 1000) : ready && query ? `${results.length} closest` : ''}
            </span>
          </div>
          <textarea
            dir="rtl"
            rows={2}
            value={liveValue}
            disabled={isListening || !ready}
            onChange={(event) => speech.setTranscript(event.target.value)}
            placeholder="اضغط الميكروفون ثم اقرأ آية…"
            aria-label="Recognised Arabic text"
            className={`${arClass} mt-2 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-xl leading-loose text-ink placeholder:text-mut focus:border-accent focus:outline-none disabled:opacity-100`}
          />
          {!ready && !loadError && (
            <div className="mt-2">
              <div className="h-1 overflow-hidden rounded-full bg-surface3">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-200"
                  style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-mut">
                Preparing the Qur’an text… {Math.round(progress * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* microphone */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex h-20 w-20 items-center justify-center">
            {isListening && (
              <>
                <span className="mic-ripple" aria-hidden="true" />
                <span className="mic-ripple mic-ripple-delay" aria-hidden="true" />
              </>
            )}
            <button
              type="button"
              onClick={toggleListening}
              disabled={!speech.supported || !ready}
              aria-label={isBusy ? 'Stop recording' : 'Start recording'}
              className={`pressable relative z-10 flex h-16 w-16 items-center justify-center rounded-full text-onaccent shadow-card disabled:opacity-40 ${
                isBusy ? 'mic-listening bg-danger' : 'bg-accent'
              }`}
            >
              <Icon name={isBusy ? 'stop' : 'mic'} size={26} />
            </button>
          </div>

          <p className="max-w-sm text-center text-xs leading-relaxed text-mut" aria-live="polite">
            {statusMessage(status, speech.supported, ready, loadError, speech.error)}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {LANGUAGES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => chooseLanguage(option.id)}
                aria-pressed={lang === option.id}
                className={`pressable inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                  lang === option.id
                    ? 'border-accent/40 bg-accent/12 text-accent'
                    : 'border-line bg-surface text-mut hover:text-ink'
                }`}
              >
                <span style={{ direction: 'rtl' }}>{option.arabic}</span>
                <span>{option.label}</span>
                <span className="tabular-nums opacity-70">{option.id}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={retry}
              disabled={!speech.supported || !ready}
              className="pressable inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
            >
              <Icon name="refresh" size={14} />
              Record again
            </button>
            <button
              type="button"
              onClick={startOver}
              disabled={!transcript && !isBusy}
              className="pressable inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-mut hover:text-ink disabled:opacity-40"
            >
              <Icon name="close" size={14} />
              Clear
            </button>
            {loadError && (
              <button
                type="button"
                onClick={() => setReloadTick((tick) => tick + 1)}
                className="pressable inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-onaccent"
              >
                <Icon name="refresh" size={14} />
                Retry loading
              </button>
            )}
          </div>
        </div>

        {/* results */}
        {ready && query.length >= 2 && (
          <div className="space-y-2 border-t border-line pt-4">
            {searching ? (
              <div className="py-6 text-center text-xs text-mut">Searching the Qur’an…</div>
            ) : results.length === 0 ? (
              <EmptyState
                icon="search"
                title="No matching āyah"
                message="Try reciting a longer passage, or correct a word in the recognised text above."
              />
            ) : (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-mut">
                  Closest matches · {results.length}
                </div>
                {results.map((hit) => (
                  <ResultRow
                    key={`${hit.surahNumber}:${hit.ayahNumber}`}
                    hit={hit}
                    arClass={arClass}
                    onSelect={() => selectHit(hit)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* pieces                                                             */
/* ------------------------------------------------------------------ */

function statusMessage(
  status: SpeechStatus,
  supported: boolean,
  ready: boolean,
  loadError: string | null,
  error: string | null,
): string {
  if (loadError) return `Could not load the Qur’an text: ${loadError}`;
  if (!supported) return 'This browser cannot record speech. Type the Arabic text above instead.';
  if (!ready) return 'Preparing the Qur’an text…';
  switch (status) {
    case 'listening':
      return 'Listening… recite an āyah, then tap stop.';
    case 'processing':
      return 'Finishing up…';
    case 'error':
      return error ?? 'Something went wrong. Try recording again.';
    case 'done':
      return 'Recognised. Tap a match below, or fix a word above.';
    default:
      return 'Tap the mic and recite any part of an āyah.';
  }
}

function ResultRow({
  hit,
  arClass,
  onSelect,
}: {
  hit: VoiceMatchResult;
  arClass: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${hit.englishName} surah ${hit.surahNumber}:${hit.ayahNumber}`}
      title={`${hit.englishName} surah ${hit.surahNumber}:${hit.ayahNumber}`}
      className="pressable block w-full rounded-2xl border border-line bg-surface p-3 text-left hover:border-accent/40"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold">
        <span className="shrink-0 rounded-full bg-accent/12 px-2 py-0.5 tabular-nums text-accent">
          {hit.surahNumber}:{hit.ayahNumber}
        </span>
        <span className="min-w-0 truncate text-ink">{hit.englishName}</span>
        <span className="min-w-0 truncate text-mut" style={{ direction: 'rtl' }}>
          {hit.surahName}
        </span>
        <span className="ml-auto shrink-0 text-mut">Ayah {hit.ayahNumber}</span>
      </div>
      <div dir="rtl" className={`${arClass} mt-2 text-[21px] leading-loose text-ink`}>
        {hit.matchedSnippet || hit.arabicText}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-mut">{hit.englishText}</p>
    </button>
  );
}
