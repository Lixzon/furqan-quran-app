import { useAppSelector } from '../../store';
import { BADGE_TONES, earnedBadge } from '../../lib/progression';

/**
 * Header streak indicator.
 *
 * Reads the unified streak state (`progress.progression`) directly, so the
 * flame, the daily popup, the weekly strip, the dashboard and the tier list all
 * render from one source of truth.
 */
export function StreakFlame() {
  const progression = useAppSelector((state) => state.progress.progression);
  if (progression.currentStreak <= 0) return null;

  const badge = earnedBadge(progression.currentStreak);
  const label =
    `${progression.currentStreak}-day streak` +
    (progression.streakFreezes > 0
      ? `, ${progression.streakFreezes} streak freeze${progression.streakFreezes === 1 ? '' : 's'} available`
      : '');

  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full bg-surface2 px-2.5 py-1 text-xs font-semibold tabular-nums text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        width={14}
        height={14}
        fill="currentColor"
        aria-hidden="true"
        style={{ color: badge ? BADGE_TONES[badge] : 'var(--q-accent)' }}
      >
        <path d="M12 2c.7 3.2-1.1 4.6-2.6 6C7.7 9.5 6 11.2 6 14.2A6 6 0 0 0 18 14.2c0-1.9-.8-3.2-1.7-4.3-.4 1-1 1.7-1.8 2.1.5-2-.3-4.6-2.5-6.4z" />
      </svg>
      {progression.currentStreak}
    </span>
  );
}
