import { selectXpProgress, useAppSelector } from '../../store';
import { XP_RATES, formatListeningTime, formatXp } from '../../lib/xp';
import { Icon, type IconName } from './Icon';

/**
 * Compact level + lifetime XP read-out, for the profile/settings surfaces and
 * the achievements modal header.
 */
export function XpPill({ className = '' }: { className?: string }) {
  const xp = useAppSelector(selectXpProgress);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-3 py-1.5 text-xs font-semibold text-ink ${className}`}
      title={`${formatXp(xp.total)} lifetime · ${formatXp(xp.toNext)} to level ${xp.level + 1}`}
    >
      <Icon name="sparkle" size={14} className="text-accent" />
      <span>Level {xp.level}</span>
      <span className="text-mut">·</span>
      <span className="tabular-nums text-mut">{formatXp(xp.total)}</span>
    </span>
  );
}

/**
 * Level, lifetime XP, progress to the next level, and the activity the total is
 * made of. Everything here is derived from the reader's own record — there is
 * no balance to spend, and no way to lose it.
 */
export function XpProgressCard({ showBreakdown = true }: { showBreakdown?: boolean }) {
  const xp = useAppSelector(selectXpProgress);

  const stats: Array<{ label: string; value: string; icon: IconName }> = [
    { label: 'Listening time', value: formatListeningTime(xp.stats.minutesListened), icon: 'headphones' },
    { label: 'Ayahs reached', value: xp.stats.ayahsReached.toLocaleString('en-US'), icon: 'book' },
    { label: 'Days active', value: xp.stats.activeDays.toLocaleString('en-US'), icon: 'sparkle' },
    { label: 'Liked items', value: xp.stats.likedItems.toLocaleString('en-US'), icon: 'heart' },
    { label: 'Copied', value: xp.stats.copyCount.toLocaleString('en-US'), icon: 'clipboard' },
    { label: 'Shared', value: xp.stats.shareCount.toLocaleString('en-US'), icon: 'share' },
  ];

  const sources: Array<{ label: string; value: number }> = [
    { label: `Recitation · ${XP_RATES.perMinuteListened} XP per minute`, value: xp.listening },
    { label: `Ayahs reached · ${XP_RATES.perAyahReached} XP each`, value: xp.ayahs },
    { label: `Reading days · ${XP_RATES.perDailySession} XP each`, value: xp.dailySessions },
    { label: `Likes and saves · ${XP_RATES.perLike} XP each`, value: xp.likes },
    { label: `Copies · ${XP_RATES.perCopy} XP each`, value: xp.copies },
    { label: `Shares · ${XP_RATES.perShare} XP each`, value: xp.shares },
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <Icon name="sparkle" size={22} />
          </span>
          <div className="min-w-0">
            <div className="text-base font-bold text-ink">Level {xp.level}</div>
            <div className="text-[11px] text-mut">Earned from your own reading and listening</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold tabular-nums text-ink">{formatXp(xp.total)}</div>
          <div className="text-[11px] text-mut">lifetime</div>
        </div>
      </div>

      <div
        className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-surface2"
        role="progressbar"
        aria-label={`Level ${xp.level} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(xp.percent)}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${xp.percent}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-mut">
        <span>{formatXp(xp.into)} of {formatXp(xp.span)}</span>
        <span>{formatXp(xp.toNext)} to level {xp.level + 1}</span>
      </div>

      {showBreakdown && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-surface2/70 px-2 py-2 text-center">
                <Icon name={stat.icon} size={15} className="mx-auto text-accent" />
                <div className="mt-1 text-sm font-semibold tabular-nums text-ink">{stat.value}</div>
                <div className="text-[10px] leading-tight text-mut">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-mut">Where it comes from</div>
            <ul className="mt-2 space-y-1">
              {sources.map((source) => (
                <li key={source.label} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-mut">{source.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink">
                    {source.value.toLocaleString('en-US')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
