import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { setJuzCompleted } from '../store/slices/progressSlice';
import { useQuran } from '../data/QuranProvider';
import { PageHeader, EmptyState } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { timeAgo, surahNumberToArabic } from '../lib/utils';

export default function ProgressPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const progress = useAppSelector((s) => s.progress);
  const { surahs } = useQuran();

  const completedSurahs = surahs
    ? surahs.filter((s) => progress.surahCompleted[s.number]).length
    : 0;
  const completedJuz = Object.keys(progress.juzCompleted).filter(
    (k) => progress.juzCompleted[Number(k)],
  ).length;

  const recentlyRead = Object.entries(progress.lastRead)
    .map(([n, v]) => ({ n: Number(n), ...v }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  const recentlyListened = Object.entries(progress.lastListened)
    .map(([n, at]) => ({ n: Number(n), at }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  const juzPct = Math.round((completedJuz / 30) * 100);

  return (
    <div className="page-enter">
      <PageHeader title="Your progress" subtitle="A little each day completes the whole Qur’an." />

      {/* overview */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard
          icon="stack"
          label="Juz complete"
          value={`${completedJuz}/30`}
          sub={`${juzPct}%`}
          onClick={undefined}
        />
        <StatCard
          icon="book"
          label="Surahs read"
          value={surahs ? `${completedSurahs}/${surahs.length}` : '—'}
          sub={surahs ? `${Math.round((completedSurahs / surahs.length) * 100)}%` : ''}
          onClick={undefined}
        />
        <StatCard
          icon="clock"
          label="Last listened"
          value={recentlyListened[0] ? surahNumberToArabic(recentlyListened[0].n) : '—'}
          sub={recentlyListened[0] ? timeAgo(recentlyListened[0].at) : 'none yet'}
          onClick={
            recentlyListened[0]
              ? () => navigate(`/surah/${recentlyListened[0].n}`)
              : undefined
          }
        />
      </div>

      {/* juz completion */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Juz / Para completion</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-mut">
            <Icon name="info" size={13} className="text-accent" />
            tap a juz to mark it
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {Array.from({ length: 30 }).map((_, i) => {
            const j = i + 1;
            const done = !!progress.juzCompleted[j];
            return (
              <button
                key={j}
                type="button"
                onClick={() => dispatch(setJuzCompleted({ juz: j, value: !done }))}
                className={`pressable flex aspect-square flex-col items-center justify-center rounded-2xl border text-sm transition-colors ${
                  done
                    ? 'border-accent bg-accent text-onaccent'
                    : 'border-line bg-surface text-mut hover:border-accent/50'
                }`}
              >
                <span className="text-base font-bold">{j}</span>
                {done && <Icon name="check" size={13} />}
              </button>
            );
          })}
        </div>
        {surahs && <div className="mt-4 text-center text-sm text-mut">This marks how many juz you’ve completed on your way to finishing the whole Qur’an.</div>}
      </div>

      {/* recently read */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-ink">Recently read</h2>
        {recentlyRead.length === 0 ? (
          <EmptyState icon="book" title="Nothing read yet" message="Open any surah to start tracking where you left off." />
        ) : (
          <div className="space-y-2">
            {recentlyRead.map((r) => {
              const meta = surahs?.find((s) => s.number === r.n);
              const total = meta?.numberOfAyahs ?? 0;
              return (
                <button
                  key={r.n}
                  type="button"
                  onClick={() => navigate(`/surah/${r.n}?ayah=${r.ayah}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left pressable"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/12 font-semibold text-accent">
                    {surahNumberToArabic(r.n)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{meta?.englishName ?? `Surah ${r.n}`}</div>
                    <div className="text-xs text-mut">
                      At āyah {r.ayah}{total ? ` of ${total}` : ''} · {timeAgo(r.at)}
                    </div>
                  </div>
                  <Icon name="forward" size={16} className="shrink-0 text-mut" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* recently listened */}
      {recentlyListened.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink">Recently listened</h2>
          <div className="flex flex-wrap gap-1.5">
            {recentlyListened.map((r) => {
              const meta = surahs?.find((s) => s.number === r.n);
              return (
                <button
                  key={r.n}
                  type="button"
                  onClick={() => navigate(`/surah/${r.n}`)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-ink pressable"
                >
                  <Icon name="music" size={12} className="text-accent" />
                  {meta?.englishName ?? `Surah ${r.n}`}
                  <span className="text-mut">{timeAgo(r.at)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: 'stack' | 'book' | 'clock';
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-mut">
        <Icon name={icon} size={13} className="text-accent" />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-ink">{value}</div>
      {sub && <div className="text-[11px] text-accent">{sub}</div>}
    </>
  );
  const cls = 'rounded-2xl bg-surface p-3';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} text-left pressable`}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}
