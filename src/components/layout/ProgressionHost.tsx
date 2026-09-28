import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  addListenMinute,
  claimTier,
  celebrateMilestone,
  clearFreezeNotice,
  markDailyCelebrated,
  recordDailyActivity,
  setIstiqamahGoal,
} from '../../store/slices/progressSlice';
import { push } from '../../store/slices/toastSlice';
import { setAccent, setMode } from '../../store/slices/themeSlice';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import {
  BADGE_TONES,
  TIERS,
  earnedBadge,
  goalOptions,
  pendingMilestone,
  todayKey,
  weeklyStrip,
  type TierDefinition,
} from '../../lib/progression';
import { islamicQuoteOfTheDay } from '../../data/quotes';

/**
 * Hosts the consistency (Istiqamah) popups and tracks listening minutes.
 * Mounted app-wide so a milestone can be celebrated from any screen.
 * Only one popup shows at a time, in priority order.
 */
export function ProgressionHost() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const progress = useAppSelector((s) => s.progress);
  const isPlaying = useAppSelector((s) => s.player.isPlaying);

  const today = todayKey();
  const progression = progress.progression;

  // Track minutes of recitation actually listened to, for the weekly recap.
  const minuteCallback = useRef(() => {});
  minuteCallback.current = () => dispatch(addListenMinute({ date: today }));
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => minuteCallback.current(), 60_000);
    return () => window.clearInterval(timer);
  }, [isPlaying, today]);

  useEffect(() => {
    dispatch(recordDailyActivity({ today }));
  }, [dispatch, today, progress.dailyActivity]);

  // A Ruksah spent automatically is reported once, then the flag is cleared.
  const freezeNotice = progression.freezeNoticeFor;
  useEffect(() => {
    if (!freezeNotice) return;
    dispatch(
      push(
        `A Ruksah protected your streak. You have ${progression.streakFreezes} left.`,
        'info',
      ),
    );
    dispatch(clearFreezeNotice());
  }, [dispatch, freezeNotice, progression.streakFreezes]);

  const tierToCelebrate = useMemo(() => {
    const reached = TIERS.filter((tier) => progression.currentStreak >= tier.days);
    return reached.reverse().find((tier) => !progression.unlockedTiers.includes(tier.tier)) ?? null;
  }, [progression.unlockedTiers, progression.currentStreak]);

  const dailyGoalJustMet =
    Boolean(progress.dailyActivity[today]) &&
    progression.lastActiveDate === today &&
    progression.dailyGoalCelebratedDate !== today;

  const milestone = pendingMilestone(progression);

  const applyTierTheme = (tier: TierDefinition) => {
    if (tier.theme?.mode) dispatch(setMode(tier.theme.mode));
    if (tier.theme?.accent) dispatch(setAccent(tier.theme.accent));
  };

  if (tierToCelebrate) {
    return (
      <Modal open onClose={() => dispatch(claimTier({ tier: tierToCelebrate.tier }))} title="A new tier unlocked">
        <Confetti />
        <div className="relative text-center">
          <FlameBadge badge={tierToCelebrate.badge} />
          <div className="mt-4 text-lg font-bold text-ink">{tierToCelebrate.name}</div>
          <div className="text-sm text-accent" style={{ direction: 'rtl' }}>{tierToCelebrate.arabicName}</div>
          <p className="mt-3 text-sm leading-relaxed text-mut">
            {tierToCelebrate.days} days of consistency. You have unlocked {tierToCelebrate.unlocks}.
          </p>
          <div className="mt-5 grid gap-2">
            {tierToCelebrate.theme && (
              <button
                type="button"
                onClick={() => {
                  applyTierTheme(tierToCelebrate);
                  dispatch(claimTier({ tier: tierToCelebrate.tier }));
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable"
              >
                <Icon name="sparkle" size={16} /> Apply this theme now
              </button>
            )}
            <button
              type="button"
              onClick={() => dispatch(claimTier({ tier: tierToCelebrate.tier }))}
              className="rounded-full px-4 py-2 text-sm font-medium text-mut"
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (dailyGoalJustMet) {
    const quote = islamicQuoteOfTheDay(new Date());
    const strip = weeklyStrip(progress.dailyActivity, today);
    return (
      <Modal open onClose={() => dispatch(markDailyCelebrated({ date: today }))} title="Today is complete">
        <div className="text-center">
          <FlameBadge badge={earnedBadge(progression.currentStreak) ?? 'bronze'} />
          <div className="mt-3 text-4xl font-bold tabular-nums text-ink">{progression.currentStreak}</div>
          <div className="text-xs font-semibold uppercase tracking-widest text-mut">day streak</div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-1">
          {strip.map((day) => (
            <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-mut">{day.label}</span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  day.done ? 'border-accent bg-accent text-onaccent' : 'border-line2 text-mut'
                } ${day.isToday ? 'ring-2 ring-accent/40' : ''}`}
              >
                {day.done && <Icon name="check" size={14} />}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/8 p-3">
          <div className="flex gap-2 text-accent">
            <Icon name="quote" size={16} className="shrink-0 opacity-80" />
            <p className="text-sm leading-relaxed text-ink">“{quote.text}”</p>
          </div>
          <div className="mt-2 pl-6 text-xs text-mut">
            {quote.by} · {quote.source}
          </div>
        </div>

        {progression.streakFreezes > 0 && (
          <p className="mt-3 text-center text-xs text-mut">
            {progression.streakFreezes} streak freeze{progression.streakFreezes === 1 ? '' : 's'} available.
          </p>
        )}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => {
              dispatch(markDailyCelebrated({ date: today }));
              navigate('/');
            }}
            className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable"
          >
            Continue reading
          </button>
          <button
            type="button"
            onClick={() => dispatch(markDailyCelebrated({ date: today }))}
            className="rounded-full px-4 py-2 text-sm font-medium text-mut"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (milestone) {
    const options = goalOptions(progression.currentStreak);
    const choose = (days: number) => {
      dispatch(setIstiqamahGoal({ days }));
      dispatch(celebrateMilestone({ days: milestone }));
    };
    const dismiss = () => dispatch(celebrateMilestone({ days: milestone }));

    // Past the final milestone there is nothing left to choose, so celebrate
    // the consistency instead of showing an empty list of goals.
    if (options.length === 0) {
      return (
        <Modal open onClose={dismiss} title="Mashallah — every milestone passed">
          <div className="text-center">
            <FlameBadge badge={earnedBadge(progression.currentStreak) ?? 'bronze'} />
            <p className="mt-4 text-sm leading-relaxed text-mut">
              You have passed every Istiqamah milestone with <b className="text-ink">{progression.currentStreak} days</b> of
              consistent reading. There is no next goal to set — only the habit itself, which is the most
              beloved of deeds.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="mt-5 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable"
          >
            Continue reading
          </button>
        </Modal>
      );
    }

    return (
      <Modal open onClose={dismiss} title="Mashallah — choose your next goal">
        <p className="text-sm leading-relaxed text-mut">
          You have completed <b className="text-ink">{milestone} days</b> of consistent reading. What
          would you like your next Istiqamah goal to be?
        </p>
        <div className="mt-4 grid gap-2">
          {options.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => choose(days)}
              className="flex items-center justify-between rounded-2xl border border-line bg-surface2 px-4 py-3 text-left pressable"
            >
              <span className="text-sm font-semibold text-ink">{days} Days</span>
              <Icon name="forward" size={16} className="text-accent" />
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  return null;
}

/** Animated flame carrying the badge tone earned so far. */
export function FlameBadge({ badge, size = 64 }: { badge: TierDefinition['badge']; size?: number }) {
  return (
    <span
      className="flame-badge relative mx-auto inline-flex items-end justify-center"
      style={{ width: size, height: size, color: BADGE_TONES[badge] }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M12 2c.7 3.2-1.1 4.6-2.6 6C7.7 9.5 6 11.2 6 14.2A6 6 0 0 0 18 14.2c0-1.9-.8-3.2-1.7-4.3-.4 1-1 1.7-1.8 2.1.5-2-.3-4.6-2.5-6.4z" />
      </svg>
      <span className="absolute inset-x-0 -bottom-1 text-center text-[10px] font-bold uppercase tracking-widest">
        {badge}
      </span>
    </span>
  );
}

/** Lightweight CSS confetti; the global reduced-motion rule disables it. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, index) => ({
        left: (index * 37) % 100,
        delay: (index % 8) * 0.12,
        hue: ['#0d9488', '#e3b341', '#7c3aed', '#e11d48', '#2563eb'][index % 5],
      })),
    [],
  );
  return (
    <div className="confetti-layer pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{ left: `${piece.left}%`, animationDelay: `${piece.delay}s`, backgroundColor: piece.hue }}
        />
      ))}
    </div>
  );
}
