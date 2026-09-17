import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { EmptyState } from '../ui/common';
import { useQuran } from '../../data/QuranProvider';
import { surahNumberToArabic } from '../../lib/utils';

/** Searchable list of all surahs to add into a playlist slot. */
export function SurahPicker({
  open,
  onClose,
  onPick,
  disabled,
  title = 'Choose a surah',
}: {
  open: boolean;
  onClose: () => void;
  onPick: (surah: number) => void;
  disabled?: Set<number>;
  title?: string;
}) {
  const { surahs } = useQuran();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    if (!surahs) return [];
    const query = q.trim().toLowerCase();
    if (!query) return surahs;
    return surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(query) ||
        s.englishNameTranslation.toLowerCase().includes(query) ||
        String(s.number).includes(query),
    );
  }, [surahs, q]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut">
          <Icon name="search" size={17} />
        </span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search surahs…"
          className="w-full rounded-xl border border-line bg-surface2 py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-mut focus:border-accent focus:outline-none"
        />
      </div>
      <div className="thin-scroll max-h-[50vh] space-y-1 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <EmptyState icon="search" title="No surahs found" message="Try another search." />
        ) : (
          filtered.map((s) => {
            const isDisabled = disabled?.has(s.number);
            return (
              <button
                key={s.number}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  onPick(s.number);
                  setQ('');
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                  isDisabled
                    ? 'cursor-not-allowed opacity-45'
                    : 'pressable hover:bg-surface2 active:bg-surface3'
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-sm font-semibold text-accent">
                  {surahNumberToArabic(s.number)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{s.englishName}</span>
                    <span className="shrink-0 text-xs text-mut">{s.numberOfAyahs} āyāt</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs text-mut">{s.englishNameTranslation}</span>
                    <span className="shrink-0 text-xs text-ink2" style={{ direction: 'rtl' }}>
                      {s.name}
                    </span>
                  </div>
                </div>
                {isDisabled ? (
                  <Icon name="check" size={18} className="shrink-0 text-accent" />
                ) : (
                  <Icon name="plus" size={18} className="shrink-0 text-accent" />
                )}
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
