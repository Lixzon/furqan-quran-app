import { useEffect, useId, useRef, useState } from 'react';
import { useAppSelector } from '../../store';
import {
  FREEZE_AWARD_AMOUNT,
  FREEZE_AWARD_EVERY_DAYS,
  FREEZE_CAP,
  nextTier,
  todayKey,
  weeklyStrip,
} from '../../lib/progression';
import { Icon } from './Icon';
import { StreakFlame } from './StreakFlame';
import { WeekStrip } from './WeekStrip';

/**
 * Streak hub: the header flame plus its quick-view popover.
 *
 * The flame is lit only once today's reading goal has been met, and everything
 * in the popover is derived from the one progression slice — no extra state.
 */
export function StreakHub() {
  const progression = useAppSelector((s) => s.progress.progression);
  const dailyActivity = useAppSelector((s) => s.progress.dailyActivity);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const today = todayKey();
  // The streak's own definition of a counted day, so the flame and the number
  // can never disagree.
  const doneToday = progression.lastActiveDate === today;
  const strip = weeklyStrip(dailyActivity, progression.freezeUsedDates, today);
  const upcoming = nextTier(progression.currentStreak);
  const toGo = upcoming ? Math.max(0, upcoming.days - progression.currentStreak) : 0;

  // Dismiss on Escape (returning focus to the flame) or on an outside click.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Streak hub — ${progression.currentStreak} day streak, ${
          doneToday ? 'completed for today' : 'not practiced yet today'
        }`}
        className={`flex items-center gap-1.5 rounded-full border py-1.5 pl-2.5 pr-2 pressable ${
          doneToday ? 'border-accent/40 bg-accent/10' : 'border-line bg-surface2'
        }`}
      >
        <StreakFlame lit={doneToday} />
        <Icon name="chevronDown" size={14} className="text-mut" />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Streak hub"
          className="frosted-panel anim-pop absolute right-0 top-[calc(100%+0.5rem)] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface/95 p-4 shadow-card backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                doneToday ? 'bg-accent text-onaccent' : 'bg-surface2 text-mut'
              }`}
            >
              <Icon name={doneToday ? 'check' : 'clock'} size={14} />
            </span>
            <span className={`text-sm font-semibold ${doneToday ? 'text-ink' : 'text-mut'}`}>
              {doneToday ? 'Completed for today!' : 'Not practiced yet today'}
            </span>
          </div>

          {!doneToday && progression.currentStreak > 0 && (
            <p
              className={`mt-3 rounded-xl border px-3 py-2 text-[11px] leading-relaxed text-ink ${
                progression.streakFreezes > 0
                  ? 'border-frozen/35 bg-frozen/10'
                  : 'border-danger/35 bg-danger/10'
              }`}
            >
              {progression.streakFreezes > 0
                ? '⚠️ No reading recorded today — a Ruksah will automatically protect your streak.'
                : '⚠️ No Ruksah remaining! Read today to keep your streak alive.'}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-surface2 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-mut">Current</div>
              <div className="text-xl font-bold tabular-nums text-ink">
                {progression.currentStreak}
                <span className="ml-1 text-xs font-medium text-mut">days</span>
              </div>
            </div>
            <div className="rounded-xl bg-surface2 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-mut">Highest</div>
              <div className="text-xl font-bold tabular-nums text-ink">
                {progression.highestStreak}
                <span className="ml-1 text-xs font-medium text-mut">days</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mut">This week</div>
            <WeekStrip days={strip} size="sm" />
          </div>

          <div className="mt-4 rounded-xl border border-accent/25 bg-accent/8 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-accent">Next target</div>
            <p className="mt-0.5 text-sm font-medium text-ink">
              {upcoming ? `${upcoming.days}-Day ${upcoming.name}` : 'Every tier reached — The Golden Istiqamah'}
            </p>
            <p className="text-xs text-mut">
              {upcoming
                ? `${toGo} day${toGo === 1 ? '' : 's'} to go`
                : 'The habit itself is the most beloved of deeds.'}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-surface2 px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              <Icon name="sparkle" size={15} className="text-accent" />
              Ruksah
            </span>
            <span className="text-sm font-bold tabular-nums text-ink">
              {progression.streakFreezes}
              <span className="text-mut">/{FREEZE_CAP}</span>
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-mut">
            A Ruksah is spent automatically if you miss a single day, so your streak carries on. You
            earn {FREEZE_AWARD_AMOUNT} more for every {FREEZE_AWARD_EVERY_DAYS} days of consistency.
          </p>
        </div>
      )}
    </div>
  );
}
