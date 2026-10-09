import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUIDANCE_CATEGORIES, QURAN_GUIDANCE, type GuidanceCategoryId } from '../data/quranGuidanceData';
import { useAppSelector } from '../store';
import { PageHeader } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/controls';
import { player } from '../audio/controller';
import { SurahArtwork } from '../components/ui/SurahArtwork';

const FILTERS: Array<{ value: 'all' | GuidanceCategoryId; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'routines', label: 'Daily & nightly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'emotional', label: 'Emotional relief' },
  { value: 'family', label: 'Family & home' },
];

export default function GuidancePage() {
  const navigate = useNavigate();
  const defaultReciter = useAppSelector((state) => state.settings.defaultReciter);
  const [filter, setFilter] = useState<'all' | GuidanceCategoryId>('all');

  const groups = useMemo(() => {
    return GUIDANCE_CATEGORIES
      .filter((category) => filter === 'all' || filter === category.id)
      .map((category) => ({
        ...category,
        items: QURAN_GUIDANCE.filter((item) => item.category === category.id),
      }));
  }, [filter]);

  return (
    <div className="page-enter">
      <PageHeader title="Quran guidance" subtitle="Reading paths and selected passages for different moments." />
      <div className="mb-4 overflow-x-auto">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((item) => ({ value: item.value, label: item.label }))}
          size="sm"
        />
      </div>
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.id} aria-label={group.label}>
            <h2 className="mb-2 text-sm font-semibold text-ink">{group.label}</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {group.items.map((item) => (
                <article key={item.id} className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition duration-300 hover:shadow-emerald-900/20">
                  <div className="absolute inset-0 -z-10">
                    <SurahArtwork surah={item.surahs[0]} className="opacity-45" />
                    <div className="absolute inset-0 bg-gradient-to-br from-surface/95 via-surface/90 to-accent/12" />
                  </div>
                  <div className="relative p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                        <p className="mt-1 text-xs font-medium text-accent">{item.timing ? `${item.timing} · ` : ''}{item.reference}</p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                        <Icon name="book" size={18} />
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink2">{item.summary}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-mut">{item.sourceNote}</p>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line/70 pt-3">
                      <button
                        type="button"
                        onClick={() => player.playRecommendedRecitation(item.surahs[0], {
                          reciter: defaultReciter,
                          startAyahIndex: item.startAyah ? item.startAyah - 1 : null,
                        })}
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-onaccent pressable"
                      >
                        <Icon name="play" size={14} /> Listen
                      </button>
                      {item.surahs.map((surahNumber) => (
                        <button
                          key={surahNumber}
                          type="button"
                          onClick={() => navigate(`/surah/${surahNumber}?ayah=${surahNumber === item.surahs[0] ? item.startAyah ?? 1 : 1}`)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-surface2/90 px-3 py-2 text-xs font-medium text-ink pressable hover:text-accent"
                        >
                          <Icon name="book" size={14} />
                          {item.surahs.length > 1 ? `Read ${surahNumber}` : 'Open in reader'}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
