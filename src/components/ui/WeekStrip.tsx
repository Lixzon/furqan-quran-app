import type { WeekDay } from '../../lib/progression';
import { Icon } from './Icon';

/**
 * The Monday-first week strip, shared by the streak hub and the daily
 * completion popup so both always agree on what a day looks like.
 *
 * Four states: read (filled accent + check), protected by a Ruksah (ice ring +
 * snowflake), still to come (dashed), and missed (plain outline). The frozen
 * state is what keeps the strip honest — the counter counts a protected day, so
 * the strip has to account for it rather than showing a bare gap.
 */
export function WeekStrip({ days, size = 'md' }: { days: WeekDay[]; size?: 'sm' | 'md' }) {
  const circle = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const glyph = size === 'sm' ? 13 : 14;

  return (
    <div className="flex items-center justify-between gap-1">
      {days.map((day) => {
        const state = day.done
          ? 'read'
          : day.frozen
            ? 'protected by a Ruksah'
            : day.isFuture
              ? 'upcoming'
              : 'not read';
        return (
          <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-mut">{day.label}</span>
            <span
              aria-label={`${day.key}, ${state}`}
              title={day.frozen ? 'Protected by a Ruksah' : undefined}
              className={`flex ${circle} items-center justify-center rounded-full border ${
                day.done
                  ? 'border-accent bg-accent text-onaccent'
                  : day.frozen
                    ? 'border-frozen/45 bg-frozen/15 text-frozen'
                    : day.isFuture
                      ? 'border-dashed border-line text-mut'
                      : 'border-line2 text-mut'
              } ${day.isToday ? 'ring-2 ring-accent/40' : ''}`}
            >
              {day.done && <Icon name="check" size={glyph} />}
              {!day.done && day.frozen && <Icon name="snowflake" size={glyph} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}
