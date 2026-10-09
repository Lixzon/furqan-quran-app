import { useEffect, useRef, useState } from 'react';
import { Modal } from './ui/Modal';
import { Icon } from './ui/Icon';
import { chooseSessionReflection } from '../data/sessionReflections';
import { loadState, saveState } from '../store/persist';

const SNOOZE_STORAGE_KEY = 'reader-session-snooze-until';
const SNOOZE_DURATION_MS = 10 * 60 * 1000;

function readSnoozeUntil(): number {
  const until = loadState<number>(SNOOZE_STORAGE_KEY, 0);
  return Number.isFinite(until) && until > Date.now() ? until : 0;
}

export function SessionEndModal({
  active,
  todayMinutes,
  goalMinutes,
  onMinute,
  onFinish,
}: {
  active: boolean;
  todayMinutes: number;
  goalMinutes: number;
  onMinute: () => void;
  onFinish: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reflection, setReflection] = useState(chooseSessionReflection);
  const [snoozeUntil, setSnoozeUntil] = useState(readSnoozeUntil);
  const elapsedRef = useRef(0);
  const reportedMinutes = useRef(0);
  const onMinuteRef = useRef(onMinute);

  useEffect(() => {
    onMinuteRef.current = onMinute;
  }, [onMinute]);

  useEffect(() => {
    if (!active) return;
    elapsedRef.current = 0;
    reportedMinutes.current = 0;
    setElapsedSeconds(0);
    let lastTick = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === 'visible') {
        elapsedRef.current += Math.min(2, Math.max(0, (now - lastTick) / 1000));
        const elapsedMinutes = Math.floor(elapsedRef.current / 60);
        while (reportedMinutes.current < elapsedMinutes) {
          reportedMinutes.current += 1;
          onMinuteRef.current();
        }
      }
      lastTick = now;
      setElapsedSeconds(Math.floor(elapsedRef.current));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (snoozeUntil <= Date.now()) return;
    const timeout = window.setTimeout(() => {
      setSnoozeUntil(0);
      saveState(SNOOZE_STORAGE_KEY, 0);
    }, snoozeUntil - Date.now());
    return () => window.clearTimeout(timeout);
  }, [snoozeUntil]);

  const snooze = () => {
    const until = Date.now() + SNOOZE_DURATION_MS;
    setSnoozeUntil(until);
    saveState(SNOOZE_STORAGE_KEY, until);
  };

  const finish = () => {
    const elapsedMinutes = Math.floor(elapsedRef.current / 60);
    while (reportedMinutes.current < elapsedMinutes) {
      reportedMinutes.current += 1;
      onMinuteRef.current();
    }
    onFinish();
    setReflection(chooseSessionReflection());
    setOpen(true);
  };

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const complete = todayMinutes >= goalMinutes;

  return (
    <>
      {active && snoozeUntil <= Date.now() && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1.5 text-white shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={finish}
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            aria-label="Finish reading session"
          >
            <Icon name="sparkle" size={14} />
            Finish Session
            <span className="tabular-nums text-white/75">{minutes}:{String(seconds).padStart(2, '0')}</span>
          </button>
          <button
            type="button"
            onClick={snooze}
            aria-label="Dismiss finish session reminder for 10 minutes"
            title="Hide for 10 minutes"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="A moment of reflection" size="sm" variant="frosted" preserveBackground>
        <div className="py-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/12 text-accent">
            <Icon name={complete ? 'check' : 'book'} size={28} />
          </div>
          <div className="mt-3 text-lg font-semibold text-ink">
            {complete ? 'Daily reading goal reached' : 'Session complete'}
          </div>
          <div className="mt-1 text-sm tabular-nums text-mut">
            {todayMinutes}/{goalMinutes} minutes today · {minutes}:{String(seconds).padStart(2, '0')} this session
          </div>
          <blockquote className="mt-5 rounded-2xl bg-surface2 p-4 text-sm leading-relaxed text-ink2">
            {reflection.text}
          </blockquote>
          <div className="mt-2 text-[11px] text-mut">{reflection.rarity === 'rare' ? 'Qur’anic reminder' : 'A quiet reflection'}</div>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent">
              Close
            </button>
            <button type="button" onClick={() => setReflection(chooseSessionReflection())} className="rounded-full bg-surface2 px-4 py-2 text-sm font-medium text-ink">
              Another reflection
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
