import { useState } from 'react';
import { useAppSelector } from '../../store';
import { nextTier, todayKey } from '../../lib/progression';
import { Icon } from './Icon';
import { StreakFlame } from './StreakFlame';
import { IstiqamahTracker } from './IstiqamahTracker';

/**
 * Streak widget: the flame and day count that sit at the right of the top bar.
 *
 * Tapping it opens the Istiqamah Tracker & Achievements modal. The number comes
 * straight from the progression slice, so the widget and the tracker can never
 * show different streaks.
 */
export function StreakHub() {
  const progression = useAppSelector((s) => s.progress.progression);
  const [open, setOpen] = useState(false);

  // The streak's own definition of a counted day, so the flame and the number
  // can never disagree.
  const doneToday = progression.lastActiveDate === todayKey();
  const upcoming = nextTier(progression.currentStreak);
  const toGo = upcoming ? Math.max(0, upcoming.days - progression.currentStreak) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Istiqamah tracker — ${progression.currentStreak} day streak, ${
          doneToday ? 'completed for today' : 'not practiced yet today'
        }. ${
          upcoming
            ? `${toGo} day${toGo === 1 ? '' : 's'} to the ${upcoming.days}-day ${upcoming.name}.`
            : 'Every tier reached.'
        }`}
        title={
          upcoming
            ? `${toGo} day${toGo === 1 ? '' : 's'} to the ${upcoming.days}-day ${upcoming.name}`
            : 'Every tier reached'
        }
        className={`flex items-center gap-1.5 rounded-full border py-1.5 pl-2.5 pr-2 pressable ${
          doneToday ? 'border-accent/40 bg-accent/10' : 'border-line bg-surface2'
        }`}
      >
        <StreakFlame lit={doneToday} />
        <Icon name="chevronDown" size={14} className="text-mut" />
      </button>

      <IstiqamahTracker open={open} onClose={() => setOpen(false)} />
    </>
  );
}
