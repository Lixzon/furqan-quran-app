import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuran } from '../../data/QuranProvider';
import type { SurahMeta } from '../../types';
import { surahNumberToArabic } from '../../lib/utils';
import { EmptyState } from '../ui/common';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

function normaliseQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row++) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column++) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function surahNames(surah: SurahMeta): string[] {
  return [surah.englishName, surah.englishNameTranslation, surah.name]
    .map(normaliseQuery)
    .filter(Boolean);
}

function closestSurahs(surahs: SurahMeta[], query: string): Array<{ surah: SurahMeta; distance: number }> {
  return surahs
    .map((surah) => ({
      surah,
      distance: Math.min(...surahNames(surah).map((name) => {
        const candidates = name.split(' ');
        return Math.min(editDistance(query, name), ...candidates.map((word) => editDistance(query, word)));
      })),
    }))
    .filter(({ distance }) => distance <= (query.length <= 5 ? 1 : 2))
    .sort((a, b) => a.distance - b.distance || a.surah.number - b.surah.number)
    .slice(0, 3);
}

export function QuranSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { surahs, error, retry } = useQuran();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const normalized = normaliseQuery(query);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    if (!surahs || !normalized) return [];
    return surahs.filter((surah) => (
      String(surah.number) === normalized ||
      surahNames(surah).some((name) => name.includes(normalized))
    ));
  }, [normalized, surahs]);

  const suggestions = useMemo(() => {
    if (!surahs || normalized.length < 3 || results.length > 0) return [];
    return closestSurahs(surahs, normalized);
  }, [normalized, results.length, surahs]);

  const openSurah = (surah: SurahMeta) => {
    onClose();
    navigate(`/surah/${surah.number}`);
  };

  const renderSurah = (surah: SurahMeta) => (
    <button
      key={surah.number}
      type="button"
      onClick={() => openSurah(surah)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface2"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-sm font-semibold text-accent">
        {surahNumberToArabic(surah.number)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-ink">{surah.number}. {surah.englishName}</span>
          <span className="shrink-0 text-sm text-ink" dir="rtl" lang="ar">{surah.name}</span>
        </span>
        <span className="block truncate text-xs text-mut">{surah.englishNameTranslation}</span>
      </span>
      <Icon name="chevronRight" size={16} className="shrink-0 text-mut" />
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Search the Qur’an" size="lg">
      <label className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut">
          <Icon name="search" size={18} />
        </span>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search in Arabic or English…"
          aria-label="Search Quran chapters in Arabic or English"
          className="w-full rounded-xl border border-line bg-surface2 py-3 pl-10 pr-4 text-sm text-ink placeholder:text-mut focus:border-accent focus:outline-none"
        />
      </label>

      <div className="thin-scroll mt-3 max-h-[55vh] overflow-y-auto">
        {error ? (
          <EmptyState
            icon="warning"
            title="Could not load chapters"
            message={`${error} Search uses the locally cached Quran chapter list when available.`}
            action={<button type="button" onClick={retry} className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-onaccent">Try again</button>}
          />
        ) : !surahs ? (
          <p className="p-4 text-center text-sm text-mut">Loading chapter list…</p>
        ) : !normalized ? (
          <p className="p-3 text-center text-xs text-mut">Search chapter names in Arabic or English. Try “Al Baqara” or “البقرة”.</p>
        ) : results.length > 0 ? (
          <div className="space-y-1">{results.slice(0, 12).map(renderSurah)}</div>
        ) : suggestions.length > 0 ? (
          <div>
            <p className="px-3 pb-1 pt-2 text-xs text-mut">No exact chapter name found. Did you mean:</p>
            <div className="space-y-1">{suggestions.map(({ surah }) => renderSurah(surah))}</div>
          </div>
        ) : (
          <EmptyState icon="search" title="No chapters found" message="Try another Arabic or English spelling, or search by chapter number." />
        )}
      </div>
    </Modal>
  );
}
