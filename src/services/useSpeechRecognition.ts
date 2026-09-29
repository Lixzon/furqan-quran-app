/**
 * Thin React wrapper over the browser's Web Speech API
 * (`SpeechRecognition` / webkit-prefixed `webkitSpeechRecognition`).
 *
 * The API is vendor-prefixed, has no TypeScript DOM lib types and is only
 * available on secure origins, so everything is feature-detected and the
 * minimal shape we rely on is declared locally.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SpeechStatus = 'unsupported' | 'idle' | 'listening' | 'processing' | 'done' | 'error';

interface SpeechAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternative;
}

interface SpeechResultList {
  length: number;
  [index: number]: SpeechResult;
}

interface SpeechResultEvent extends Event {
  resultIndex: number;
  results: SpeechResultList;
}

interface SpeechErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognizer extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
}

type SpeechRecognizerCtor = new () => SpeechRecognizer;

interface SpeechWindow {
  SpeechRecognition?: SpeechRecognizerCtor;
  webkitSpeechRecognition?: SpeechRecognizerCtor;
}

function getRecognizerCtor(): SpeechRecognizerCtor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as SpeechWindow;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** Human-readable copy for the error codes the API can raise. */
const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it for this site, then try again.',
  'service-not-allowed': 'Your browser blocked speech recognition. Check its microphone permissions.',
  'audio-capture': 'No microphone was found. Plug one in, then try again.',
  'no-speech': 'We did not catch anything. Move a little closer and recite again.',
  network: 'Speech recognition needs an internet connection.',
  'language-not-supported': 'That recognition language is not available on this device.',
  aborted: 'Recording was cancelled.',
};

export interface SpeechRecognitionOptions {
  /** BCP-47 tag, e.g. `ar-SA`. */
  lang?: string;
  /** Retried once if the primary language is unavailable, e.g. `ar-EG`. */
  fallbackLang?: string;
  /** Hard stop so a forgotten session cannot record forever. */
  maxDurationMs?: number;
  /** Auto-finalise this long after the speaker stops. */
  silenceMs?: number;
  /** Called once with the final transcript when a session ends with speech. */
  onFinal?: (transcript: string) => void;
}

export interface SpeechRecognitionApi {
  /** Whether this browser exposes the API at all. */
  supported: boolean;
  status: SpeechStatus;
  /** Confirmed (final) transcript so far. */
  transcript: string;
  /** In-flight words, replaced as the recognizer revises them. */
  interim: string;
  error: string | null;
  /** Milliseconds since listening began. */
  elapsedMs: number;
  /** Language actually in use (may differ after a fallback). */
  lang: string;
  start: () => void;
  /** Finalise the current session. */
  stop: () => void;
  /** Discard the session and the transcript. */
  cancel: () => void;
  /** Replace the transcript manually (typing instead of reciting). */
  setTranscript: (text: string) => void;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}): SpeechRecognitionApi {
  const { lang = 'ar-SA', fallbackLang = 'ar-EG', maxDurationMs = 30_000, silenceMs = 1_000, onFinal } = options;

  const supported = useMemo(() => getRecognizerCtor() !== null, []);

  const [status, setStatus] = useState<SpeechStatus>(supported ? 'idle' : 'unsupported');
  const [transcript, setTranscriptState] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeLang, setActiveLang] = useState(lang);

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const finalRef = useRef('');
  const stoppedRef = useRef(false);
  const abortedRef = useRef(false);
  const startedAtRef = useRef(0);
  const langRef = useRef(lang);
  const fallbackRef = useRef(fallbackLang);
  const silenceRef = useRef(silenceMs);
  const maxDurationRef = useRef(maxDurationMs);
  const silenceTimerRef = useRef<number | null>(null);
  const hardTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const onFinalRef = useRef(onFinal);
  const startRef = useRef<() => void>(() => {});

  useEffect(() => {
    langRef.current = lang;
    fallbackRef.current = fallbackLang;
    silenceRef.current = silenceMs;
    maxDurationRef.current = maxDurationMs;
    onFinalRef.current = onFinal;
  }, [lang, fallbackLang, silenceMs, maxDurationMs, onFinal]);

  // Switching language mid-session is not supported by the API.
  useEffect(() => {
    if (recognizerRef.current) return;
    setActiveLang(lang);
  }, [lang]);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current !== null) window.clearTimeout(silenceTimerRef.current);
    if (hardTimerRef.current !== null) window.clearTimeout(hardTimerRef.current);
    if (tickTimerRef.current !== null) window.clearInterval(tickTimerRef.current);
    silenceTimerRef.current = null;
    hardTimerRef.current = null;
    tickTimerRef.current = null;
  }, []);

  /** Detaching handlers first keeps a stale session from writing new state. */
  const detach = useCallback((recognizer: SpeechRecognizer) => {
    recognizer.onstart = null;
    recognizer.onresult = null;
    recognizer.onerror = null;
    recognizer.onspeechend = null;
    recognizer.onend = null;
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearTimers();
    const recognizer = recognizerRef.current;
    if (!recognizer) return;
    setStatus((current) => (current === 'listening' ? 'processing' : current));
    try {
      recognizer.stop();
    } catch {
      // Already stopped.
    }
  }, [clearTimers]);

  const cancel = useCallback(() => {
    abortedRef.current = true;
    stoppedRef.current = true;
    clearTimers();
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (recognizer) {
      detach(recognizer);
      try {
        recognizer.abort();
      } catch {
        // Already stopped.
      }
    }
    finalRef.current = '';
    setTranscriptState('');
    setInterim('');
    setElapsedMs(0);
    setError(null);
    setStatus(supported ? 'idle' : 'unsupported');
  }, [clearTimers, detach, supported]);

  const setTranscript = useCallback((text: string) => {
    finalRef.current = text;
    setTranscriptState(text);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognizerCtor();
    if (!Ctor) {
      setStatus('unsupported');
      return;
    }

    // Drop any previous session without letting its events leak in.
    const previous = recognizerRef.current;
    if (previous) {
      detach(previous);
      try {
        previous.abort();
      } catch {
        // Already stopped.
      }
      recognizerRef.current = null;
    }
    clearTimers();

    abortedRef.current = false;
    stoppedRef.current = false;
    finalRef.current = '';
    setTranscriptState('');
    setInterim('');
    setError(null);
    setElapsedMs(0);
    setStatus('listening');

    const recognizer = new Ctor();
    recognizer.lang = langRef.current;
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 3;
    recognizerRef.current = recognizer;

    const scheduleSilenceStop = (delay = silenceRef.current) => {
      if (silenceTimerRef.current !== null) window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(() => stop(), delay);
    };

    recognizer.onstart = () => {
      startedAtRef.current = Date.now();
      tickTimerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);
      hardTimerRef.current = window.setTimeout(() => stop(), maxDurationRef.current);
    };

    recognizer.onresult = (event) => {
      let final = '';
      let live = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) final += `${text.trim()} `;
        else live += text;
      }
      finalRef.current = final.trim();
      setTranscriptState(finalRef.current);
      setInterim(live.trim());
      scheduleSilenceStop();
    };

    recognizer.onspeechend = () => scheduleSilenceStop(600);

    recognizer.onerror = (event) => {
      if (event.error === 'aborted') return;

      // Some Android builds reject `ar-SA`; retire this session and retry with
      // the fallback language on a fresh recognizer.
      if (event.error === 'language-not-supported' && recognizer.lang !== fallbackRef.current) {
        const fallback = fallbackRef.current;
        langRef.current = fallback;
        setActiveLang(fallback);
        clearTimers();
        detach(recognizer);
        if (recognizerRef.current === recognizer) recognizerRef.current = null;
        try {
          recognizer.abort();
        } catch {
          // Already stopped.
        }
        startRef.current();
        return;
      }

      clearTimers();
      setError(ERROR_MESSAGES[event.error] ?? `Speech recognition failed (${event.error}).`);
      setStatus('error');
    };

    recognizer.onend = () => {
      clearTimers();
      recognizerRef.current = null;
      setInterim('');
      if (abortedRef.current) {
        setStatus('idle');
        return;
      }
      const text = finalRef.current.trim();
      if (text) {
        setStatus('done');
        onFinalRef.current?.(text);
      } else {
        setStatus((current) => (current === 'error' ? 'error' : 'idle'));
      }
    };

    try {
      recognizer.start();
    } catch {
      clearTimers();
      recognizerRef.current = null;
      setError('Recording could not start. Try again.');
      setStatus('error');
    }
  }, [clearTimers, detach, stop]);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  useEffect(
    () => () => {
      abortedRef.current = true;
      clearTimers();
      const recognizer = recognizerRef.current;
      if (recognizer) {
        detach(recognizer);
        try {
          recognizer.abort();
        } catch {
          // Already stopped.
        }
        recognizerRef.current = null;
      }
    },
    [clearTimers, detach],
  );

  return {
    supported,
    status,
    transcript,
    interim,
    error,
    elapsedMs,
    lang: activeLang,
    start,
    stop,
    cancel,
    setTranscript,
  };
}
