import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { push } from '../store/slices/toastSlice';
import { mergeCloudStreak } from '../store/slices/progressSlice';
import { mergeCloudMemorized, type MemorizedAyah } from '../store/slices/memorizedSlice';
import {
  CLOUD_SYNC_PAIR_CHANGED_EVENT,
  CLOUD_SYNC_REQUEST_EVENT,
  createPairCode,
  forgetPairCode,
  getSavedPairCode,
  isPairingCodeRevokedError,
  isSupabaseSyncConfigured,
  joinPairCode,
  readPairedRecords,
  revokePairCode,
  upsertPairedRecords,
  type SharedSyncRecord,
} from '../services/cloudSync';

type CloudRecordInput = Pick<SharedSyncRecord, 'record_key' | 'payload'>;

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateOrNull(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function parseMemorizedAyah(payload: Record<string, unknown>, id: string): MemorizedAyah | null {
  const surah = payload.surah;
  const ayah = payload.ayah;
  const repetitions = payload.repetitions;
  const playCount = payload.playCount;
  const updatedAt = payload.updatedAt;
  if (
    typeof surah !== 'number' || !Number.isInteger(surah) || surah < 1 || surah > 114 ||
    typeof ayah !== 'number' || !Number.isInteger(ayah) || ayah < 1 || ayah > 286 ||
    id !== `${surah}:${ayah}` ||
    typeof payload.surahName !== 'string' ||
    typeof payload.arabic !== 'string' ||
    typeof payload.translation !== 'string' ||
    typeof repetitions !== 'number' || !Number.isInteger(repetitions) || repetitions < 0 ||
    typeof playCount !== 'number' || !Number.isInteger(playCount) || playCount < 0 ||
    typeof payload.memorized !== 'boolean' ||
    typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)
  ) {
    return null;
  }
  return {
    id,
    surah,
    ayah,
    surahName: payload.surahName,
    arabic: payload.arabic,
    translation: payload.translation,
    repetitions,
    playCount,
    memorized: payload.memorized,
    updatedAt,
  };
}

function CloudSyncCoordinator() {
  const dispatch = useAppDispatch();
  const progress = useAppSelector((state) => state.progress.progression);
  const memorizedItems = useAppSelector((state) => state.memorized.items);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [readyPairCode, setReadyPairCode] = useState<string | null>(null);
  const lastPushed = useRef(new Map<string, string>());

  const handleSyncError = useCallback((error: unknown, fallback: string) => {
    if (isPairingCodeRevokedError(error)) {
      try {
        forgetPairCode();
        setPairCode(null);
        window.dispatchEvent(new Event(CLOUD_SYNC_PAIR_CHANGED_EVENT));
        dispatch(push('This pairing was revoked on another device. Shared cloud records were deleted; local data remains.', 'error'));
      } catch (storageError) {
        dispatch(push(storageError instanceof Error ? storageError.message : 'The revoked pairing code could not be removed from this browser.', 'error'));
      }
      return;
    }
    dispatch(push(error instanceof Error ? error.message : fallback, 'error'));
  }, [dispatch]);

  const records = useMemo<CloudRecordInput[]>(() => {
    const result: CloudRecordInput[] = [
      {
        record_key: 'furqan.progression',
        payload: {
          source: 'furqan',
          currentStreak: progress.currentStreak,
          highestStreak: progress.highestStreak,
          lastActiveDate: progress.lastActiveDate,
        },
      },
    ];
    for (const item of memorizedItems) {
      result.push({
        record_key: `furqan.memorized:${item.surah}:${item.ayah}`,
        payload: {
          source: 'furqan',
          id: item.id,
          surah: item.surah,
          ayah: item.ayah,
          surahName: item.surahName,
          arabic: item.arabic,
          translation: item.translation,
          repetitions: item.repetitions,
          playCount: item.playCount ?? 0,
          memorized: item.memorized,
          updatedAt: item.updatedAt,
        },
      });
    }
    const now = new Date();
    const dayOfYear = Math.floor(
      (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
        Date.UTC(now.getFullYear(), 0, 1)) / 86_400_000,
    );
    result.push({
      record_key: `quran.daily-highlight:${localDateKey(now)}`,
      payload: {
        source: 'furqan',
        date: localDateKey(now),
        globalAyah: (dayOfYear % 6236) + 1,
      },
    });
    return result;
  }, [memorizedItems, progress]);

  const applyRemoteRecord = useCallback((record: SharedSyncRecord) => {
    lastPushed.current.set(record.record_key, stableJson(record.payload));
    if (record.record_key === 'furqan.progression') {
      const { currentStreak, highestStreak, lastActiveDate } = record.payload;
      if (
        typeof currentStreak === 'number' && Number.isInteger(currentStreak) &&
        currentStreak >= 0 && currentStreak <= 10_000 &&
        typeof highestStreak === 'number' && Number.isInteger(highestStreak) &&
        highestStreak >= 0 && highestStreak <= 10_000 &&
        isValidDateOrNull(lastActiveDate)
      ) {
        dispatch(mergeCloudStreak({
          currentStreak,
          highestStreak,
          lastActiveDate,
        }));
      } else {
        console.warn('Ignored invalid Furqan progression data received from cloud sync.');
      }
      return;
    }
    const memorizedMatch = /^furqan\.memorized:(\d{1,3}):(\d{1,3})$/.exec(record.record_key);
    if (memorizedMatch) {
      const item = parseMemorizedAyah(record.payload, `${memorizedMatch[1]}:${memorizedMatch[2]}`);
      if (item) dispatch(mergeCloudMemorized(item));
      else console.warn('Ignored invalid Furqan memorization data received from cloud sync.');
    }
  }, [dispatch]);

  useEffect(() => {
    setPairCode(getSavedPairCode());
    const refreshPairCode = () => setPairCode(getSavedPairCode());
    window.addEventListener(CLOUD_SYNC_PAIR_CHANGED_EVENT, refreshPairCode);
    return () => window.removeEventListener(CLOUD_SYNC_PAIR_CHANGED_EVENT, refreshPairCode);
  }, []);

  useEffect(() => {
    lastPushed.current.clear();
    setReadyPairCode(null);
    if (!pairCode || !isSupabaseSyncConfigured()) return;
    let active = true;
    let interval = 0;
    const refresh = async () => {
      const remoteRecords = await readPairedRecords(pairCode);
      if (!active) return;
      remoteRecords.forEach(applyRemoteRecord);
    };
    void refresh()
      .then(() => {
        if (!active) return;
        setReadyPairCode(pairCode);
        interval = window.setInterval(() => {
          void refresh().catch((error: unknown) => {
            if (active) handleSyncError(error, 'Could not refresh paired app data.');
          });
        }, 15_000);
      })
      .catch((error: unknown) => {
        if (active) handleSyncError(error, 'Could not load paired app data.');
      });
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [applyRemoteRecord, handleSyncError, pairCode]);

  const pushChangedRecords = useCallback(async (force = false) => {
    if (!pairCode || readyPairCode !== pairCode) return;
    const changed = records.filter((record) =>
      force || lastPushed.current.get(record.record_key) !== stableJson(record.payload),
    );
    for (let index = 0; index < changed.length; index += 100) {
      const batch = changed.slice(index, index + 100);
      await upsertPairedRecords(pairCode, batch);
      batch.forEach((record) => lastPushed.current.set(record.record_key, stableJson(record.payload)));
    }
  }, [pairCode, readyPairCode, records]);

  useEffect(() => {
    if (readyPairCode !== pairCode || !pairCode) return;
    const timer = window.setTimeout(() => {
      void pushChangedRecords().catch((error: unknown) => {
        handleSyncError(error, 'Could not sync paired app data.');
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [handleSyncError, pairCode, pushChangedRecords, readyPairCode]);

  useEffect(() => {
    const syncNow = () => {
      void pushChangedRecords(true).then(() => {
        dispatch(push('Furqan progress synced with Mishkah.', 'success'));
      }).catch((error: unknown) => {
        handleSyncError(error, 'Could not sync paired app data.');
      });
    };
    window.addEventListener(CLOUD_SYNC_REQUEST_EVENT, syncNow);
    return () => window.removeEventListener(CLOUD_SYNC_REQUEST_EVENT, syncNow);
  }, [dispatch, handleSyncError, pushChangedRecords]);

  return null;
}

export function CloudSyncProvider() {
  return <CloudSyncCoordinator />;
}

export function CloudSyncPanel() {
  const configured = isSupabaseSyncConfigured();
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [entry, setEntry] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPairCode(getSavedPairCode());
    const refreshPairCode = () => setPairCode(getSavedPairCode());
    window.addEventListener(CLOUD_SYNC_PAIR_CHANGED_EVENT, refreshPairCode);
    return () => window.removeEventListener(CLOUD_SYNC_PAIR_CHANGED_EVENT, refreshPairCode);
  }, []);

  const create = async () => {
    setBusy(true);
    try {
      const code = await createPairCode();
      setPairCode(code);
      setMessage('Pairing code created. Enter it in Mishkah to connect the apps.');
      window.dispatchEvent(new Event(CLOUD_SYNC_PAIR_CHANGED_EVENT));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create a pairing code.');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    try {
      const code = await joinPairCode(entry);
      setPairCode(code);
      setEntry('');
      setMessage('Mishkah is paired. Syncing Quran progress now.');
      window.dispatchEvent(new Event(CLOUD_SYNC_PAIR_CHANGED_EVENT));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not join that pairing.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    forgetPairCode();
    setPairCode(null);
    setMessage('This device is disconnected. Other devices with this code remain paired.');
    window.dispatchEvent(new Event(CLOUD_SYNC_PAIR_CHANGED_EVENT));
  };

  const revoke = async () => {
    if (!pairCode || !window.confirm(
      'Revoke this pairing for every device? Shared cloud records will be deleted, but each device keeps its local data.',
    )) return;
    setBusy(true);
    try {
      const revoked = await revokePairCode(pairCode);
      forgetPairCode();
      setPairCode(null);
      setMessage(
        revoked
          ? 'Pairing revoked everywhere. Shared cloud records were deleted; local data remains on this device.'
          : 'This pairing was already revoked. Local data remains on this device.',
      );
      window.dispatchEvent(new Event(CLOUD_SYNC_PAIR_CHANGED_EVENT));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not revoke the app pairing.');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!pairCode || !navigator.clipboard) {
      setMessage('Select and copy the pairing code manually.');
      return;
    }
    try {
      await navigator.clipboard.writeText(pairCode);
      setMessage('Pairing code copied.');
    } catch (error) {
      setMessage(error instanceof Error ? `Could not copy the code: ${error.message}` : 'Could not copy the code.');
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-1 text-sm font-semibold text-ink">Pair Mishkah</div>
      <p className="mb-3 text-xs leading-relaxed text-muted">
        Use one private code to sync reading streaks, memorized ayahs, and the Qur’an verse of the day across your paired devices.
      </p>
      {!configured ? (
        <p className="text-xs text-muted">
          Pairing is unavailable until this build is configured with the shared Supabase project.
        </p>
      ) : (
        <>
          {pairCode ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="select-all rounded-lg bg-surface2 px-3 py-2 text-sm font-semibold tracking-widest text-ink">{pairCode}</code>
              <button type="button" disabled={busy} onClick={() => void copyCode()} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink disabled:opacity-50">Copy code</button>
              <button type="button" disabled={busy} onClick={() => window.dispatchEvent(new Event(CLOUD_SYNC_REQUEST_EVENT))} className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-onaccent disabled:opacity-50">Sync now</button>
              <button type="button" disabled={busy} onClick={disconnect} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink disabled:opacity-50">Disconnect this device</button>
              <button type="button" disabled={busy} onClick={() => void revoke()} className="rounded-full border border-red-300 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-50">Revoke everywhere</button>
            </div>
          ) : (
            <div className="space-y-3">
              <button type="button" disabled={busy} onClick={() => void create()} className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-onaccent disabled:opacity-50">
                {busy ? 'Working…' : 'Create pairing code'}
              </button>
              <div className="flex flex-wrap gap-2">
                <input
                  value={entry}
                  onChange={(event) => setEntry(event.target.value)}
                  aria-label="Mishkah pairing code"
                  placeholder="Enter Mishkah’s 20-character code"
                  maxLength={24}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink"
                />
                <button type="button" disabled={busy || !entry.trim()} onClick={() => void join()} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink disabled:opacity-50">Pair with Mishkah</button>
              </div>
            </div>
          )}
          {message && <p role="status" className="mt-2 text-xs text-muted">{message}</p>}
        </>
      )}
    </section>
  );
}
