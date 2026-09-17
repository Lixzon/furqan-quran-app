import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppDispatch, useAppSelector } from '../store';
import { push } from '../store/slices/toastSlice';
import { setDefaultReciter } from '../store/slices/settingsSlice';
import { useQuran } from '../data/QuranProvider';
import { db, deleteStoredAudio, isUsableAudio, type StoredAudio } from '../db/database';
import { downloadSurahAudio } from '../services/audioStore';
import { RECITERS } from '../lib/constants';
import { formatBytes, surahNumberToArabic } from '../lib/utils';
import { PageHeader, EmptyState } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';

export default function DownloadsPage() {
  const dispatch = useAppDispatch();
  const quran = useQuran();
  const defaultReciter = useAppSelector((s) => s.settings.defaultReciter);
  const [reciter, setReciter] = useState(defaultReciter);
  const [busy, setBusy] = useState<Record<number, number>>({});
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [confirmDownloadAll, setConfirmDownloadAll] = useState(false);
  const [allProgress, setAllProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [confirmClear, setConfirmClear] = useState<'all' | null>(null);

  const rows = useLiveQuery(
    async () => db.audio.where('reciter').equals(reciter).toArray(),
    [reciter],
  );
  const stored = (rows ?? []).filter(isUsableAudio);
  const sizeBySurah = new Map(stored.map((s: StoredAudio) => [s.surah, s.size]));
  const downloadedCount = stored.length;
  const totalBytes = stored.reduce((s, x) => s + x.size, 0);

  if (!quran.surahs) {
    return (
      <div className="page-enter">
        <PageHeader title="Offline downloads" subtitle="Recitations stored on this device." />
        <EmptyState icon="download" title="Loading…" />
      </div>
    );
  }
  const allSurahs = quran.surahs;

  const pickReciter = (id: string) => {
    setReciter(id);
    dispatch(setDefaultReciter(id));
  };

  const toggleOne = async (surah: number) => {
    if (sizeBySurah.has(surah)) {
      await deleteStoredAudio(reciter, surah);
      const meta = allSurahs.find((s) => s.number === surah);
      dispatch(push(`Removed ${meta?.englishName ?? surah} download.`, 'info'));
      return;
    }
    setBusy((b) => ({ ...b, [surah]: 0 }));
    try {
      const size = await downloadSurahAudio(reciter, surah, (p) =>
        setBusy((b) => ({ ...b, [surah]: p })),
      );
      const meta = allSurahs.find((s) => s.number === surah);
      dispatch(push(`Downloaded ${meta?.englishName ?? surah} (${formatBytes(size)}).`, 'success'));
    } catch (e) {
      dispatch(push(e instanceof Error ? e.message : 'Download failed.', 'error'));
    } finally {
      setBusy((b) => ({ ...b, [surah]: -1 }));
    }
  };

  const downloadAll = async () => {
    const missing = allSurahs.filter((s) => !sizeBySurah.has(s.number));
    setConfirmDownloadAll(false);
    if (missing.length === 0) {
      dispatch(push('All surahs for this reciter are already downloaded.', 'info'));
      return;
    }
    setDownloadingAll(true);
    setAllProgress({ completed: downloadedCount, total: allSurahs.length });
    let ok = 0;
    let fail = 0;
    // sequential to be kind to the CDN
    for (const s of missing) {
      setBusy((b) => ({ ...b, [s.number]: 0 }));
      try {
        await downloadSurahAudio(reciter, s.number, (p) =>
          setBusy((b) => ({ ...b, [s.number]: p })),
        );
        ok++;
      } catch {
        fail++;
      } finally {
        setBusy((b) => ({ ...b, [s.number]: -1 }));
        setAllProgress((p) => ({ ...p, completed: p.completed + 1 }));
      }
    }
    setDownloadingAll(false);
    dispatch(
      push(
        `Downloaded ${ok} surah${ok === 1 ? '' : 's'}${fail ? ` · ${fail} failed (offline?)` : ''}`,
        fail ? 'error' : 'success',
      ),
    );
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Offline downloads"
        subtitle="Store recitations on this device for listening without internet."
      />

      {/* reciter picker */}
      <div className="thin-scroll mb-3 flex gap-2 overflow-x-auto pb-1">
        {RECITERS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => pickReciter(r.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              r.id === reciter ? 'bg-accent text-onaccent' : 'bg-surface text-mut hover:text-ink'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* stats */}
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-surface p-3 text-sm">
        <div className="flex items-center gap-2 text-ink">
          <Icon name="download" size={18} className="text-accent" />
          <span>
            <b>{downloadedCount}</b> of {quran.surahs.length} surahs downloaded
          </span>
        </div>
        <span className="text-xs tabular-nums text-mut">{formatBytes(totalBytes)} used</span>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setConfirmDownloadAll(true)}
          disabled={downloadingAll}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable disabled:opacity-60"
        >
          <Icon name="download" size={16} />
          {downloadingAll ? `${allProgress.completed} of ${allProgress.total} downloaded` : 'Download all'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmClear('all')}
          disabled={stored.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-mut pressable disabled:opacity-40"
        >
          <Icon name="trash" size={15} />
          Clear
        </button>
      </div>

      {/* list */}
      <div className="space-y-1.5">
        {quran.surahs.map((s) => {
          const has = sizeBySurah.has(s.number);
          const state = busy[s.number];
          const working = state !== undefined && state >= 0;
          const pct = working ? state : undefined;
          return (
            <div
              key={s.number}
              className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-xs font-semibold text-accent">
                {surahNumberToArabic(s.number)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{s.englishName}</div>
                <div className="text-[11px] text-mut">
                  {working
                    ? `Downloading ${Math.round((pct ?? 0) * 100)}%`
                    : has
                      ? formatBytes(sizeBySurah.get(s.number) ?? 0)
                      : `${s.numberOfAyahs} āyāt`}
                </div>
              </div>
              {working ? (
                <span className="shrink-0 text-xs font-semibold text-accent">
                  {Math.round((pct ?? 0) * 100)}%
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={has ? `Delete download of ${s.englishName}` : `Download ${s.englishName}`}
                  onClick={() => toggleOne(s.number)}
                  className={`pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    has
                      ? 'bg-surface2 text-mut hover:text-danger'
                      : 'bg-accent text-onaccent'
                  }`}
                >
                  <Icon name={has ? 'check' : 'download'} size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-mut">
        Downloads are stored in this browser’s local storage (IndexedDB) and play fully offline.
      </p>

      <Modal open={confirmDownloadAll} onClose={() => setConfirmDownloadAll(false)} title="Download all surahs?">
        <p className="text-sm text-mut">
          This will download the remaining {allSurahs.length - downloadedCount} surahs for {RECITERS.find((r) => r.id === reciter)?.label ?? 'this reciter'}. A complete reciter can use several hundred megabytes of storage. Downloads are saved one at a time, so completed surahs will not be downloaded again if the process is interrupted.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmDownloadAll(false)}
            className="rounded-full px-4 py-2 text-sm font-medium text-mut hover:bg-surface2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void downloadAll()}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent"
          >
            Start download
          </button>
        </div>
      </Modal>

      {/* clear-all confirm */}
      <Modal open={confirmClear === 'all'} onClose={() => setConfirmClear(null)} title="Clear all downloads?">
        <p className="text-sm text-mut">
          This removes <b>{downloadedCount}</b> stored audio files ({formatBytes(totalBytes)}) for
          every reciter from this device. You can re-download anytime.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmClear(null)}
            className="rounded-full px-4 py-2 text-sm font-medium text-mut hover:bg-surface2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await db.audio.clear();
              setConfirmClear(null);
              dispatch(push('All downloads cleared.', 'info'));
            }}
            className="rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"
          >
            Clear
          </button>
        </div>
      </Modal>
    </div>
  );
}
