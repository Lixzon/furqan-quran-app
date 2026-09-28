import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { push } from '../../store/slices/toastSlice';
import { setMode } from '../../store/slices/themeSlice';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { WeekStrip } from './WeekStrip';
import {
  FREEZE_AWARD_AMOUNT,
  FREEZE_AWARD_EVERY_DAYS,
  FREEZE_CAP,
  todayKey,
  weeklyStrip,
} from '../../lib/progression';
import {
  CUSTOM_READING_THEMES,
  MILESTONE_UNLOCKS,
  isAiUiUnlocked,
  isReadingThemesUnlocked,
  lockedText,
  unlockProgress,
} from '../../lib/unlocks';
import type { ThemeMode } from '../../types';

/**
 * Istiqamah Tracker & Achievements.
 *
 * Opened from the streak widget in the top bar. Everything shown is derived
 * from the one progression slice plus the unlock registry, so the milestone
 * bars here can never disagree with the locks on the Settings screen.
 */
export function IstiqamahTracker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const progression = useAppSelector((s) => s.progress.progression);
  const dailyActivity = useAppSelector((s) => s.progress.dailyActivity);
  const themeMode = useAppSelector((s) => s.theme.mode);

  const today = todayKey();
  const streak = progression.currentStreak;
  // The streak's own definition of a counted day, so the header and this modal agree.
  const doneToday = progression.lastActiveDate === today;
  const strip = weeklyStrip(dailyActivity, progression.freezeUsedDates, today);
  const readingThemesUnlocked = isReadingThemesUnlocked(streak);
  const aiUiUnlocked = isAiUiUnlocked(streak);
  const unlockedMilestones = MILESTONE_UNLOCKS.filter((milestone) => streak >= milestone.days).length;

  const applyTheme = (mode: ThemeMode, label: string) => {
    dispatch(setMode(mode));
    dispatch(push(`${label} reading theme applied.`, 'success'));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Istiqamah Tracker & Achievements" size="lg">
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

      {!doneToday && streak > 0 && (
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

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-surface2 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-mut">Current</div>
          <div className="text-xl font-bold tabular-nums text-ink">
            {streak}
            <span className="ml-1 text-xs font-medium text-mut">d</span>
          </div>
        </div>
        <div className="rounded-xl bg-surface2 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-mut">Highest</div>
          <div className="text-xl font-bold tabular-nums text-ink">
            {progression.highestStreak}
            <span className="ml-1 text-xs font-medium text-mut">d</span>
          </div>
        </div>
        <div className="rounded-xl bg-surface2 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-mut">Ruksah</div>
          <div className="text-xl font-bold tabular-nums text-ink">
            {progression.streakFreezes}
            <span className="text-mut">/{FREEZE_CAP}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mut">This week</div>
        <WeekStrip days={strip} size="sm" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Achievements</h3>
        <span className="text-[11px] uppercase tracking-[0.18em] text-mut">
          {unlockedMilestones}/{MILESTONE_UNLOCKS.length} unlocked
        </span>
      </div>

      <div className="mt-2 space-y-3">
        {MILESTONE_UNLOCKS.map((milestone) => {
          const unlocked = streak >= milestone.days;
          const { ratio, remaining } = unlockProgress(streak, milestone.days);
          return (
            <div
              key={milestone.id}
              className={`rounded-2xl border p-3.5 ${
                unlocked ? 'border-accent/40 bg-accent/8' : 'border-line bg-surface2'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    unlocked ? 'bg-accent text-onaccent' : 'bg-surface3 text-mut'
                  }`}
                >
                  <Icon name={unlocked ? 'unlock' : 'lock'} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">
                    {milestone.days} Days{' '}
                    <span className="text-xs font-normal text-mut">· {milestone.title}</span>
                  </div>
                  <div className="text-xs text-mut">{milestone.summary}</div>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5">
                {milestone.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-mut">
                    <Icon
                      name={unlocked ? 'check' : 'lock'}
                      size={13}
                      className={`mt-0.5 shrink-0 ${unlocked ? 'text-accent' : 'text-mut'}`}
                    />
                    <span className="flex-1">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-mut">
                  <span>
                    {unlocked
                      ? 'Unlocked'
                      : `${remaining} day${remaining === 1 ? '' : 's'} to go`}
                  </span>
                  <span className="tabular-nums">
                    {Math.min(streak, milestone.days)}/{milestone.days}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface3">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      unlocked ? 'bg-accent' : 'bg-accent/70'
                    }`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>

              {!unlocked && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-mut">
                  <Icon name="lock" size={13} />
                  {lockedText(milestone.days)}
                </p>
              )}

              {unlocked && milestone.id === 'reading-themes' && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {CUSTOM_READING_THEMES.map((option) => {
                    const active = themeMode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => applyTheme(option.id, option.label)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-medium pressable ${
                          active ? 'border-accent bg-surface' : 'border-line bg-surface hover:border-accent/40'
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-line"
                          style={{ backgroundColor: option.swatch }}
                        >
                          {active && <Icon name="check" size={12} className="text-white" />}
                        </span>
                        <span className="text-ink">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {unlocked && milestone.id === 'ai-ui' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/settings');
                  }}
                  className="mt-3 flex w-full items-center justify-between rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-onaccent pressable"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon name="sparkle" size={16} />
                    Customize your UI
                  </span>
                  <Icon name="forward" size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-mut">
        A Ruksah is spent automatically if you miss a single day, so your streak carries on. You earn{' '}
        {FREEZE_AWARD_AMOUNT} more for every {FREEZE_AWARD_EVERY_DAYS} days of consistency. The habit
        itself is the most beloved of deeds.
      </p>

      {aiUiUnlocked && readingThemesUnlocked && (
        <p className="mt-2 text-[11px] leading-relaxed text-mut">
          Every milestone reached — may Allah keep you steadfast.
        </p>
      )}
    </Modal>
  );
}
