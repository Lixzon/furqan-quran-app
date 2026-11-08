import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { push } from '../store/slices/toastSlice';
import { mergeCloudStreak } from '../store/slices/progressSlice';
import { mergeCloudMemorized, type MemorizedAyah } from '../store/slices/memorizedSlice';
import {
  CLOUD_SYNC_REQUEST_EVENT,
  isSupabaseSyncConfigured,
  readCloudUser,
  readSharedRecords,
  startGoogleCloudSignIn,
  stopCloudSignIn,
  subscribeToCloudAuth,
  subscribeToSharedRecords,
  upsertSharedRecords,
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
  const [userId, setUserId] = useState<string | null>(null);
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const authEventReceived = useRef(false);
  const lastPushed = useRef(new Map<string, string>());

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
    if (!isSupabaseSyncConfigured()) return;
    let active = true;
    authEventReceived.current = false;
    const unsubscribe = subscribeToCloudAuth((nextUserId) => {
      if (active) {
        authEventReceived.current = true;
        setUserId(nextUserId);
      }
    });
    void readCloudUser().then((user) => {
      if (active && !authEventReceived.current) setUserId(user?.id ?? null);
    }).catch((error: unknown) => {
      if (active) dispatch(push(error instanceof Error ? error.message : 'Could not verify cloud sign-in.', 'error'));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    lastPushed.current.clear();
    setReadyUserId(null);
    if (!userId || !isSupabaseSyncConfigured()) return;
    let active = true;
    let unsubscribe: (() => Promise<void>) | undefined;
    void (async () => {
      const stop = await subscribeToSharedRecords(applyRemoteRecord);
      if (!active) {
        await stop();
        return;
      }
      unsubscribe = stop;
      const remoteRecords = await readSharedRecords();
      if (!active) return;
      remoteRecords.forEach(applyRemoteRecord);
      setReadyUserId(userId);
    })().catch((error: unknown) => {
      if (active) dispatch(push(error instanceof Error ? error.message : 'Could not load cloud progress.', 'error'));
    });
    return () => {
      active = false;
      if (unsubscribe) void unsubscribe();
    };
  }, [applyRemoteRecord, dispatch, userId]);

  const pushChangedRecords = useCallback(async (force = false) => {
    if (!userId || readyUserId !== userId) return;
    const changed = records.filter((record) =>
      force || lastPushed.current.get(record.record_key) !== stableJson(record.payload),
    );
    for (let index = 0; index < changed.length; index += 100) {
      const batch = changed.slice(index, index + 100);
      await upsertSharedRecords(batch);
      batch.forEach((record) => lastPushed.current.set(record.record_key, stableJson(record.payload)));
    }
  }, [readyUserId, records, userId]);

  useEffect(() => {
    if (readyUserId !== userId || !userId) return;
    const timer = window.setTimeout(() => {
      void pushChangedRecords().catch((error: unknown) => {
        dispatch(push(error instanceof Error ? error.message : 'Could not sync cloud progress.', 'error'));
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [dispatch, pushChangedRecords, readyUserId, userId]);

  useEffect(() => {
    const syncNow = () => {
      void pushChangedRecords(true).then(() => {
        dispatch(push('Furqan progress synced.', 'success'));
      }).catch((error: unknown) => {
        dispatch(push(error instanceof Error ? error.message : 'Could not sync cloud progress.', 'error'));
      });
    };
    window.addEventListener(CLOUD_SYNC_REQUEST_EVENT, syncNow);
    return () => window.removeEventListener(CLOUD_SYNC_REQUEST_EVENT, syncNow);
  }, [dispatch, pushChangedRecords]);

  return null;
}

export function CloudSyncProvider() {
  return <CloudSyncCoordinator />;
}

export function CloudSyncPanel() {
  const dispatch = useAppDispatch();
  const configured = isSupabaseSyncConfigured();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    const updateUser = (nextUserId: string | null, nextEmail: string | null) => {
      if (active) setEmail(nextUserId ? nextEmail : null);
    };
    const unsubscribe = subscribeToCloudAuth(updateUser);
    void readCloudUser().then((user) => {
      if (active) setEmail(user?.email ?? null);
    }).catch((error: unknown) => {
      if (active) dispatch(push(error instanceof Error ? error.message : 'Could not verify cloud sign-in.', 'error'));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [configured, dispatch]);

  const connect = async () => {
    setBusy(true);
    try {
      await startGoogleCloudSignIn();
    } catch (error) {
      dispatch(push(error instanceof Error ? error.message : 'Google sign-in failed.', 'error'));
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await stopCloudSignIn();
      setEmail(null);
      dispatch(push('Cloud sync disconnected.', 'success'));
    } catch (error) {
      dispatch(push(error instanceof Error ? error.message : 'Could not sign out of cloud sync.', 'error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-1 text-sm font-semibold text-ink">LIXZON cloud sync</div>
      <p className="mb-3 text-xs leading-relaxed text-muted">
        Keep your Furqan memorization and streak progress in sync across your devices.
      </p>
      {!configured ? (
        <p className="text-xs text-muted">
          Cloud sync is unavailable until this build is configured with a Supabase project.
        </p>
      ) : email ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-xs text-muted">Connected as {email}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => window.dispatchEvent(new Event(CLOUD_SYNC_REQUEST_EVENT))}
            className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-onaccent disabled:opacity-50"
          >
            Sync now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void connect()}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-onaccent disabled:opacity-50"
        >
          {busy ? 'Connecting…' : 'Connect with Google'}
        </button>
      )}
    </section>
  );
}
