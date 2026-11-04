import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { toggleMemorizedAyah } from '../store/slices/memorizedSlice';
import { EmptyState } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';

export default function MemorizedAyahsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.memorized.items);
  const [query, setQuery] = useState('');
  const memorizedItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return items
      .filter((item) => item.memorized)
      .filter((item) => !needle || [
        item.surahName,
        item.arabic,
        item.translation,
        `${item.surah}:${item.ayah}`,
      ].some((value) => value.toLocaleLowerCase().includes(needle)))
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }, [items, query]);

  return (
    <div className="space-y-3">
      {items.some((item) => item.memorized) && (
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut">
            <Icon name="search" size={17} />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search memorized ayahs…"
            aria-label="Search memorized ayahs"
            className="w-full rounded-2xl border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-mut focus:border-accent focus:outline-none"
          />
        </label>
      )}

      {memorizedItems.length === 0 ? (
        <EmptyState
          icon="book"
          title={query ? 'No memorized ayahs match' : 'No memorized ayahs yet'}
          message={query ? 'Try another search.' : 'Open an ayah and choose “Mark as memorized”. Complete 50 focused repetitions to mark one automatically.'}
        />
      ) : (
        memorizedItems.map((item) => (
          <article key={item.id} className="rounded-2xl border border-line bg-surface p-3">
            <button
              type="button"
              onClick={() => navigate(`/surah/${item.surah}?ayah=${item.ayah}`)}
              className="block w-full text-left"
            >
              <span className="block text-xs font-semibold text-accent">
                Surah {item.surah} · {item.surahName} · Ayah {item.ayah}
              </span>
              <span dir="rtl" className="mt-2 block text-sm text-mut">{item.arabic}</span>
              <span className="mt-1 block text-sm leading-relaxed text-ink2">{item.translation}</span>
            </button>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2">
              <span className="text-[11px] tabular-nums text-mut">{item.repetitions} focused repetitions</span>
              <button
                type="button"
                aria-pressed="true"
                onClick={() => dispatch(toggleMemorizedAyah(item))}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-onaccent transition hover:brightness-110"
              >
                <Icon name="check" size={14} />
                Memorized
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
