import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activityDayKey, shiftDateKey } from '../../lib/progression';
import { useAppDispatch, useAppSelector } from '../../store';
import { addReadMinute } from '../../store/slices/progressSlice';
import { setDailyReadingGoalMinutes } from '../../store/slices/settingsSlice';
import { loadState, saveState } from '../../store/persist';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { chooseSessionReflection, type SessionReflection } from '../../data/sessionReflections';

const SNOOZE_STORAGE_KEY = 'goal-tracker-snooze-until';
const SNOOZE_DURATION_MS = 10 * 60 * 1000;

function readSnoozeUntil(): number {
  const until = loadState<number>(SNOOZE_STORAGE_KEY, 0);
  return Number.isFinite(until) && until > Date.now() ? until : 0;
}

interface GoalTimerState {
  dayKey: string;
  elapsedSeconds: number;
  isRunning: boolean;
}

function readTimerState(dayKey: string): GoalTimerState {
  const stored = loadState<Partial<GoalTimerState> | null>('goal-tracker', null);
  if (
    stored?.dayKey === dayKey &&
    typeof stored.elapsedSeconds === 'number' &&
    Number.isFinite(stored.elapsedSeconds) &&
    stored.elapsedSeconds >= 0
  ) {
    return {
      dayKey,
      elapsedSeconds: Math.floor(stored.elapsedSeconds),
      isRunning: false,
    };
  }
  return { dayKey, elapsedSeconds: 0, isRunning: false };
}

export function GoalTracker() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const progress = useAppSelector((state) => state.progress);
  const candidateDayKey = activityDayKey(new Date(), progress.dailyActivity);
  const [timer, setTimer] = useState(() => readTimerState(candidateDayKey));
  const isInGraceWindow = new Date().getHours() < 3;
  const dayKey = isInGraceWindow && timer.isRunning && timer.dayKey === shiftDateKey(candidateDayKey, -1)
    ? timer.dayKey
    : candidateDayKey;
  const [snoozeUntil, setSnoozeUntil] = useState(readSnoozeUntil);
  const [reflection, setReflection] = useState<SessionReflection>(() => chooseSessionReflection());
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const reportedMinutes = useRef(Math.floor(timer.elapsedSeconds / 60));
  const timerRef = useRef(timer);
  timerRef.current = timer;

  const pauseTimer = useCallback(() => {
    const current = timerRef.current;
    if (!current.isRunning) return;
    const paused = { ...current, isRunning: false };
    timerRef.current = paused;
    saveState('goal-tracker', paused);
    setTimer(paused);
  }, []);

  useEffect(() => {
    if (timer.dayKey !== dayKey) {
      const next = readTimerState(dayKey);
      reportedMinutes.current = Math.floor(next.elapsedSeconds / 60);
      setTimer(next);
    }
  }, [dayKey, timer.dayKey]);

  useEffect(() => {
    if (!timer.isRunning || timer.dayKey !== dayKey) return;
    const interval = window.setInterval(() => {
      setTimer((current) => ({
        ...current,
        elapsedSeconds: current.elapsedSeconds + 1,
      }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [dayKey, timer.dayKey, timer.isRunning]);

  useEffect(() => {
    if (timer.dayKey !== dayKey) return;
    const completedMinutes = Math.floor(timer.elapsedSeconds / 60);
    while (reportedMinutes.current < completedMinutes) {
      reportedMinutes.current += 1;
      dispatch(addReadMinute({
        at: Date.now(),
        goalMinutes: settings.dailyReadingGoalMinutes,
      }));
    }
  }, [dayKey, dispatch, settings.dailyReadingGoalMinutes, timer.dayKey, timer.elapsedSeconds]);

  useEffect(() => {
    if (timer.dayKey === dayKey) saveState('goal-tracker', timer);
  }, [dayKey, timer]);

  useEffect(() => {
    if (snoozeUntil <= Date.now()) return;
    const timeout = window.setTimeout(() => {
      setSnoozeUntil(0);
      saveState(SNOOZE_STORAGE_KEY, 0);
    }, snoozeUntil - Date.now());
    return () => window.clearTimeout(timeout);
  }, [snoozeUntil]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === 'hidden') pauseTimer();
    };
    const pauseWhenWindowLosesFocus = () => pauseTimer();
    document.addEventListener('visibilitychange', pauseWhenHidden);
    window.addEventListener('blur', pauseWhenWindowLosesFocus);
    window.addEventListener('pagehide', pauseWhenWindowLosesFocus);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      window.removeEventListener('blur', pauseWhenWindowLosesFocus);
      window.removeEventListener('pagehide', pauseWhenWindowLosesFocus);
      pauseTimer();
    };
  }, [pauseTimer]);

  const todayMinutes = progress.progression.dailyReadMinutes[dayKey] ?? 0;
  const goalMinutes = settings.dailyReadingGoalMinutes;
  const goalReached = todayMinutes >= goalMinutes;
  const circumference = 2 * Math.PI * 28;
  const progressRatio = Math.min(1, todayMinutes / goalMinutes);
  const elapsedLabel = useMemo(() => {
    const minutes = Math.floor(timer.elapsedSeconds / 60);
    const seconds = timer.elapsedSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [timer.elapsedSeconds]);

  const resetTimer = () => {
    reportedMinutes.current = 0;
    const reset = { dayKey, elapsedSeconds: 0, isRunning: false };
    timerRef.current = reset;
    setTimer(reset);
  };

  const snoozeFinishPill = () => {
    const until = Date.now() + SNOOZE_DURATION_MS;
    setSnoozeUntil(until);
    saveState(SNOOZE_STORAGE_KEY, until);
  };

  const finishSession = () => {
    pauseTimer();
    setReflection(chooseSessionReflection());
    setReflectionOpen(true);
  };

  return (
    <>
      <section
        aria-label="Daily reading goal"
        className="rounded-2xl border border-white/10 bg-black/60 p-3.5 text-white shadow-lg backdrop-blur-md"
      >
      <div className="flex items-center gap-3">
        <svg
          className="h-[68px] w-[68px] shrink-0 -rotate-90"
          viewBox="0 0 72 72"
          role="img"
          aria-label={`${todayMinutes} of ${goalMinutes} reading minutes`}
        >
          <circle cx="36" cy="36" r="28" fill="none" stroke="rgb(255 255 255 / 15%)" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r="28"
            fill="none"
            stroke="var(--q-accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progressRatio)}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>

        <div className="min-w-0 flex-1">
          <label htmlFor="daily-reading-goal" className="text-[11px] font-semibold text-white/65">
            Daily reading goal
          </label>
          <div className="mt-0.5 text-lg font-bold tabular-nums">
            {todayMinutes}/{goalMinutes} min
          </div>
          <div className={`text-[10px] font-medium ${goalReached ? 'text-emerald-300' : 'text-white/60'}`} aria-live="polite">
            {goalReached ? 'Goal reached — keep reading' : 'Read at your own pace'}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xs font-semibold tabular-nums text-white/85">{elapsedLabel}</div>
          <div className="text-[9px] text-white/50">this session</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-white/60">
          <span>Target</span>
          <span className="tabular-nums">{goalMinutes} minutes</span>
        </div>
        <input
          id="daily-reading-goal"
          type="range"
          min={5}
          max={60}
          step={1}
          value={goalMinutes}
          onChange={(event) => dispatch(setDailyReadingGoalMinutes(Number(event.target.value)))}
          aria-label="Daily reading goal in minutes"
          className="w-full accent-[var(--q-accent)]"
        />
      </div>

      <div className="mt-2 flex gap-2">
        {!timer.isRunning ? (
          <button
            type="button"
            onClick={() => {
              const started = { ...timerRef.current, dayKey, isRunning: true };
              timerRef.current = started;
              setTimer(started);
            }}
            className="min-h-9 flex-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Start
          </button>
        ) : (
          <button
            type="button"
            onClick={pauseTimer}
            className="min-h-9 flex-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Pause
          </button>
        )}
        <button
          type="button"
          onClick={resetTimer}
          disabled={timer.elapsedSeconds === 0 && !timer.isRunning}
          className="min-h-9 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
      </div>
      <p className="sr-only">Timer and daily goal are saved on this device.</p>
      </section>

      {timer.isRunning && snoozeUntil <= Date.now() && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1.5 text-white shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={finishSession}
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Icon name="sparkle" size={15} />
            Finish Session
            <span className="tabular-nums text-white/65">{elapsedLabel}</span>
          </button>
          <button
            type="button"
            onClick={snoozeFinishPill}
            aria-label="Dismiss finish session reminder for 10 minutes"
            title="Hide for 10 minutes"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      <Modal
        open={reflectionOpen}
        onClose={() => setReflectionOpen(false)}
        title="A moment of reflection"
        size="sm"
        variant="frosted"
        preserveBackground
      >
        <div className="py-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/12 text-accent">
            <Icon name={goalReached ? 'check' : 'book'} size={28} />
          </div>
          <div className="mt-3 text-lg font-semibold text-ink">
            {goalReached ? 'Daily reading goal reached' : 'Session complete'}
          </div>
          <div className="mt-1 text-sm tabular-nums text-mut">
            {todayMinutes}/{goalMinutes} minutes today · {elapsedLabel} this session
          </div>
          <blockquote className="mt-5 rounded-2xl bg-surface2 p-4 text-sm leading-relaxed text-ink2">
            {reflection.text}
          </blockquote>
          <div className="mt-2 text-[11px] text-mut">
            {reflection.rarity === 'rare' ? 'Qur’anic reminder' : 'A quiet reflection'}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setReflectionOpen(false)}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setReflection(chooseSessionReflection())}
              className="rounded-full bg-surface2 px-4 py-2 text-sm font-medium text-ink"
            >
              Another reflection
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
