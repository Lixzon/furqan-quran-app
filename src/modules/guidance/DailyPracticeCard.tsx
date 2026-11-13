import { useAppDispatch, useAppSelector } from '../../store';
import { saveDailyReflection, toggleFastDay } from '../../store/slices/guidanceSlice';

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DailyPracticeCard() {
  const dispatch = useAppDispatch();
  const date = localDateKey();
  const fastedToday = useAppSelector((state) => Boolean(state.guidance.fastingDays[date]));
  const reflection = useAppSelector((state) => state.guidance.reflections[date] ?? '');

  return (
    <>
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">Fasting tracker</p>
        <p className="mt-2 text-sm leading-relaxed text-ink2">Keep a gentle record of voluntary or make-up fasts you observe.</p>
        <button
          type="button"
          aria-pressed={fastedToday}
          onClick={() => dispatch(toggleFastDay(date))}
          className={`mt-3 min-h-10 rounded-full px-4 text-xs font-semibold transition-colors ${
            fastedToday ? 'bg-accent text-onaccent' : 'border border-line bg-surface2 text-ink hover:border-accent/50'
          }`}
        >
          {fastedToday ? 'Fasted today · recorded' : 'Mark a fast for today'}
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <label htmlFor="daily-reflection" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
          Personal reflection
        </label>
        <p className="mt-2 text-sm leading-relaxed text-ink2">What would you like to carry from today’s reading into tomorrow?</p>
        <textarea
          id="daily-reflection"
          value={reflection}
          maxLength={2000}
          onChange={(event) => dispatch(saveDailyReflection({ date, text: event.target.value }))}
          placeholder="Write a note for yourself…"
          className="mt-3 min-h-24 w-full resize-y rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-mut focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <p className="mt-2 text-right text-[10px] text-muted">Saved with your Manāra progress</p>
      </section>
    </>
  );
}
