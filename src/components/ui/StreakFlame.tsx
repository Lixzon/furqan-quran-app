import { useAppSelector } from '../../store';
import { BADGE_TONES, earnedBadge } from '../../lib/progression';

/**
 * The flame itself, shared by the header hub.
 *
 * `lit` is the single visual switch: badge-tinted and glowing once today's
 * reading goal has been met, flat grey until then. Presentational only —
 * `StreakHub` owns the click target, the label and the popover.
 */
export function StreakFlame({ lit }: { lit: boolean }) {
  const progression = useAppSelector((state) => state.progress.progression);
  const badge = earnedBadge(progression.currentStreak);

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
        lit ? 'streak-flame-on' : 'streak-flame-off'
      }`}
      style={lit ? { color: badge ? BADGE_TONES[badge] : 'var(--q-accent)' } : undefined}
    >
      <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden="true">
        <path d="M12 2c.7 3.2-1.1 4.6-2.6 6C7.7 9.5 6 11.2 6 14.2A6 6 0 0 0 18 14.2c0-1.9-.8-3.2-1.7-4.3-.4 1-1 1.7-1.8 2.1.5-2-.3-4.6-2.5-6.4z" />
      </svg>
      {progression.currentStreak}
    </span>
  );
}
