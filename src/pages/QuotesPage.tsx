import { useMemo, useState } from 'react';
import { PageHeader } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { Chip } from '../components/ui/controls';
import { QUOTES, QUOTE_THEMES, QUOTE_THEME_LABELS, quoteOfTheDayIndex } from '../data/quotes';
import { useAppDispatch } from '../store';
import { push } from '../store/slices/toastSlice';
import type { QuoteEntry, QuoteTheme } from '../types';

export default function QuotesPage() {
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<QuoteTheme | 'all'>('all');
  const [featuredIdx, setFeaturedIdx] = useState(() => quoteOfTheDayIndex(new Date()));

  const featured = QUOTES[featuredIdx] ?? QUOTES[0];

  const filtered = useMemo(() => {
    if (filter === 'all') return QUOTES;
    return QUOTES.filter((q) => q.themes.includes(filter));
  }, [filter]);

  const shuffle = () => {
    setFeaturedIdx(Math.floor(Math.random() * QUOTES.length));
  };

  const copy = async (q: QuoteEntry) => {
    try {
      await navigator.clipboard.writeText(`${q.text}\n— ${q.by} (${q.source})`);
      dispatch(push('Copied to clipboard', 'success'));
    } catch {
      dispatch(push('Could not copy', 'error'));
    }
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Sayings & Quotes"
        subtitle="Words of the Prophet ﷺ and the Companions to lift the heart."
        right={
          <button
            type="button"
            onClick={shuffle}
            aria-label="Show another saying"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-onaccent pressable"
          >
            <Icon name="sparkle" size={16} />
            Another
          </button>
        }
      />

      {/* featured card */}
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accentstrong p-5 text-onaccent shadow-card">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-black/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest opacity-90">
            <Icon name="quote" size={14} />
            Quote of the day
          </div>
          <p className="mt-3 text-lg font-medium leading-relaxed">“{featured.text}”</p>
          <div className="mt-3 text-sm opacity-95">
            — {featured.by}
            <span className="ml-2 opacity-80">· {featured.source}</span>
          </div>
          <button
            type="button"
            onClick={() => copy(featured)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold pressable"
          >
            <Icon name="heart" size={13} />
            Copy
          </button>
        </div>
      </div>

      {/* theme filters */}
      <div className="thin-scroll -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-accent text-onaccent' : 'bg-surface text-mut hover:text-ink'
          }`}
        >
          All
        </button>
        {QUOTE_THEMES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(filter === t ? 'all' : t)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === t ? 'bg-accent text-onaccent' : 'bg-surface text-mut hover:text-ink'
            }`}
          >
            {QUOTE_THEME_LABELS[t]}
          </button>
        ))}
      </div>

      {/* list */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-mut">No sayings under this theme yet.</div>
        )}
        {filtered.map((q) => (
          <div key={q.id} className="rounded-2xl border border-transparent bg-surface p-4">
            <div className="flex gap-2 text-gold">
              <Icon name="quote" size={18} className="shrink-0 opacity-70" />
              <p className="text-[15px] leading-relaxed text-ink">“{q.text}”</p>
            </div>
            <div className="mt-2.5 flex items-start justify-between gap-3 pl-6">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink2">{q.by}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-mut">
                  <Icon name="book" size={12} />
                  {q.source}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {q.themes.map((t) => (
                    <button key={t} type="button" onClick={() => setFilter(t)}>
                      <Chip tone="accent">{QUOTE_THEME_LABELS[t]}</Chip>
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                aria-label="Copy quote"
                onClick={() => copy(q)}
                className="shrink-0 rounded-full p-2 text-mut hover:bg-surface2 hover:text-accent"
              >
                <Icon name="heart" size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
