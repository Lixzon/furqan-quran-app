import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { push } from '../store/slices/toastSlice';
import { createBackupJson, parseBackupJson, restoreBackup, type FurqanBackup } from '../lib/backup';
import {
  CLOUD_BACKUP_ENABLED_EVENT,
  CLOUD_BACKUP_ENABLED_KEY_PREFIX,
  getCloudUserEmail,
  getSupabaseClient,
  isSupabaseSyncConfigured,
  readCloudBackup,
  requestEmailCode,
  signOutCloudAccount,
  verifyEmailCode,
  writeCloudBackup,
} from '../services/cloudSync';

function enableAutomaticBackup(email: string): void {
  try {
    window.localStorage.setItem(`${CLOUD_BACKUP_ENABLED_KEY_PREFIX}${email.toLowerCase()}`, 'true');
    window.dispatchEvent(new Event(CLOUD_BACKUP_ENABLED_EVENT));
  } catch {
    throw new Error('Automatic backup could not be enabled in this browser.');
  }
}

export function CloudSyncProvider() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme);
  const settings = useAppSelector((state) => state.settings);
  const progress = useAppSelector((state) => state.progress);
  const playlists = useAppSelector((state) => state.playlists);
  const likes = useAppSelector((state) => state.likes);
  const bookmarks = useAppSelector((state) => state.bookmarks);
  const memorizedItems = useAppSelector((state) => state.memorized.items);
  const backupJson = useMemo(() => createBackupJson(), [
    theme, settings, progress, playlists, likes, bookmarks, memorizedItems,
  ]);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [enableVersion, setEnableVersion] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    const applySession = (email: string | null) => {
      if (active) setAccountEmail(email?.toLowerCase() ?? null);
    };
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        dispatch(push(`Could not check the cloud backup account: ${error.message}`, 'error'));
        return;
      }
      applySession(data.session?.user.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user.email ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    const enable = () => setEnableVersion((version) => version + 1);
    window.addEventListener(CLOUD_BACKUP_ENABLED_EVENT, enable);
    return () => window.removeEventListener(CLOUD_BACKUP_ENABLED_EVENT, enable);
  }, []);

  useEffect(() => {
    if (!accountEmail || !isSupabaseSyncConfigured()) return;
    try {
      if (window.localStorage.getItem(`${CLOUD_BACKUP_ENABLED_KEY_PREFIX}${accountEmail}`) !== 'true') return;
    } catch (error) {
      dispatch(push(error instanceof Error ? error.message : 'Automatic backup settings could not be read.', 'error'));
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Cloud backup is not configured for this build.');
        const { data, error } = await supabase.auth.getUser();
        if (error) throw new Error(`Could not verify the cloud backup account: ${error.message}`);
        if (data.user?.email?.toLowerCase() !== accountEmail) return;
        const payload: Record<string, unknown> = JSON.parse(backupJson) as Record<string, unknown>;
        await writeCloudBackup(payload);
      })().catch((error: unknown) => {
        if (active) dispatch(push(error instanceof Error ? error.message : 'Automatic cloud backup failed.', 'error'));
      });
    }, 1400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [accountEmail, backupJson, dispatch, enableVersion]);

  return null;
}

export function CloudSyncPanel() {
  const configured = isSupabaseSyncConfigured();
  const [backupEmail, setBackupEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [cloudBackup, setCloudBackup] = useState<{ payload: Record<string, unknown>; updated_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refreshCloudBackup = async (email: string) => {
    const remote = await readCloudBackup();
    if (remote) {
      setCloudBackup(remote);
      setMessage(`A Manāra backup exists from ${new Date(remote.updated_at).toLocaleString()}. Restore it or replace it with this device's data.`);
      return;
    }
    const payload: Record<string, unknown> = JSON.parse(createBackupJson()) as Record<string, unknown>;
    await writeCloudBackup(payload);
    enableAutomaticBackup(email);
    setCloudBackup(await readCloudBackup());
    setMessage('Your Manāra cloud backup is saved. Future progress and settings changes back up automatically.');
  };

  useEffect(() => {
    let active = true;
    void getCloudUserEmail()
      .then(async (email) => {
        if (!active || !email) return;
        setAccountEmail(email);
        setBackupEmail(email);
        await refreshCloudBackup(email);
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : 'Could not load the cloud backup account.');
      });
    return () => {
      active = false;
    };
  }, []);

  const sendCode = async () => {
    setBusy(true);
    setMessage('');
    try {
      await requestEmailCode(backupEmail);
      setEmailCodeSent(true);
      setMessage('A one-time sign-in code was sent to your email.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send the sign-in code.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setBusy(true);
    setMessage('');
    try {
      const email = await verifyEmailCode(backupEmail, emailCode);
      setAccountEmail(email);
      setBackupEmail(email);
      setEmailCode('');
      setEmailCodeSent(false);
      await refreshCloudBackup(email);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not verify the email code.');
    } finally {
      setBusy(false);
    }
  };

  const backUpThisDevice = async () => {
    if (!accountEmail) return;
    if (cloudBackup && !window.confirm('Replace the existing Manāra cloud backup with the data on this device?')) return;
    setBusy(true);
    setMessage('');
    try {
      const payload: Record<string, unknown> = JSON.parse(createBackupJson()) as Record<string, unknown>;
      await writeCloudBackup(payload);
      enableAutomaticBackup(accountEmail);
      setCloudBackup(await readCloudBackup());
      setMessage('This device is backed up. Future progress and settings changes will back up automatically.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not back up this device.');
    } finally {
      setBusy(false);
    }
  };

  const restoreCloudBackup = async () => {
    if (!cloudBackup || !accountEmail) return;
    if (!window.confirm('Restore this cloud backup over the Manāra data currently on this device?')) return;
    setBusy(true);
    setMessage('');
    try {
      const backup: FurqanBackup = parseBackupJson(JSON.stringify(cloudBackup.payload));
      restoreBackup(backup);
      enableAutomaticBackup(accountEmail);
      setMessage('Your Manāra backup has been restored. Automatic backup is now active.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not restore the cloud backup.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await signOutCloudAccount();
      setAccountEmail(null);
      setCloudBackup(null);
      setMessage('Signed out. Your saved Manāra data was not changed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-3 rounded-2xl border border-line bg-surface p-4">
      <div className="mb-1 text-sm font-semibold text-ink">Manāra cloud backup</div>
      <p className="mb-3 text-xs leading-relaxed text-muted">
        Back up your Quran progress, bookmarks, memorized ayahs, likes, playlists, and settings to your account.
      </p>
      {!configured ? (
        <p className="text-xs text-muted">Cloud backup is unavailable until this build is configured with the shared Supabase project.</p>
      ) : accountEmail ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">Signed in as <span className="font-medium text-ink">{accountEmail}</span></p>
          <p className="text-xs text-muted">{cloudBackup ? `Last backup: ${new Date(cloudBackup.updated_at).toLocaleString()}` : 'No cloud backup exists yet.'}</p>
          {cloudBackup && <button type="button" disabled={busy} onClick={() => void restoreCloudBackup()} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink disabled:opacity-50">Restore cloud backup</button>}
          <button type="button" disabled={busy} onClick={() => void backUpThisDevice()} className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-onaccent disabled:opacity-50">
            {cloudBackup ? 'Replace cloud backup with this device' : 'Back up this device now'}
          </button>
          <button type="button" disabled={busy} onClick={() => void signOut()} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink disabled:opacity-50">Sign out</button>
        </div>
      ) : (
        <div className="space-y-3">
          <input type="email" autoComplete="email" autoCapitalize="none" value={backupEmail} onChange={(event) => setBackupEmail(event.target.value)} disabled={busy || emailCodeSent} aria-label="Backup account email" placeholder="Email address" className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink" />
          <button type="button" disabled={busy || !backupEmail.trim()} onClick={() => void sendCode()} className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-onaccent disabled:opacity-50">{busy ? 'Sending code…' : 'Send email sign-in code'}</button>
          {emailCodeSent && (
            <div className="flex flex-wrap gap-2">
              <input type="text" inputMode="numeric" autoComplete="one-time-code" value={emailCode} onChange={(event) => setEmailCode(event.target.value)} disabled={busy} aria-label="Email sign-in code" placeholder="One-time code" className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink" />
              <button type="button" disabled={busy || !emailCode.trim()} onClick={() => void verifyCode()} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink disabled:opacity-50">Verify code</button>
            </div>
          )}
        </div>
      )}
      {message && <p role="status" className="mt-2 text-xs text-muted">{message}</p>}
    </section>
  );
}
