import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ISLAMIC_ARCHIVE } from '../../Mishkah/src/domain/archives';
import { PageHeader } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { useSectionSwitcher } from '../shared/SectionSwitcher';

export default function MishkaArchivesPage() {
  const [searchParams] = useSearchParams();
  const { requestSwitch } = useSectionSwitcher();
  const selectedId = searchParams.get('item');
  const entries = useMemo(() => {
    const selected = ISLAMIC_ARCHIVE.find((entry) => entry.id === selectedId);
    return selected
      ? [selected, ...ISLAMIC_ARCHIVE.filter((entry) => entry.id !== selected.id)]
      : ISLAMIC_ARCHIVE;
  }, [selectedId]);

  return (
    <div className="page-enter">
      <PageHeader title="Stories & archives" subtitle="Brief introductions with their source close at hand." />
      <div className="space-y-3">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className={`rounded-2xl border bg-surface p-4 ${entry.id === selectedId ? 'border-accent/50 ring-1 ring-accent/15' : 'border-line'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">{entry.category}</p>
                <h2 className="mt-1 font-semibold text-ink">{entry.title}</h2>
              </div>
              <Icon name="book" size={19} className="shrink-0 text-accent" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink2">{entry.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10">
                  {source.label}
                </a>
              ))}
              {entry.id === 'maryam-devotion' ? (
                <button
                  type="button"
                  onClick={() => requestSwitch(
                    'furqan',
                    '/surah/19?ayah=16',
                    'Do you want to switch to Furqan to read Surah Maryam?',
                  )}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-onaccent"
                >
                  Read Surah Maryam in Furqan ↗
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
