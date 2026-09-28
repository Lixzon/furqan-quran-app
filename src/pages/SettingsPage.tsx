import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { push } from '../store/slices/toastSlice';
import { setMode, setAccent } from '../store/slices/themeSlice';
import {
  setShowArabic,
  setShowTransliteration,
  setShowTranslation,
  setArabicFontScale,
  setScript,
  setReadingMode,
  setDefaultReciter,
  setFollowAudio,
  setNotificationPreference,
  setReminderTime,
} from '../store/slices/settingsSlice';
import { clearAllProgress, devAddStreakDays, devResetStreak, devSetStreak, setIstiqamahGoal } from '../store/slices/progressSlice';
import { BADGE_TONES, ISTIQAMAH_MILESTONES, TIERS, isTierUnlocked, tierProgress } from '../lib/progression';
import { db } from '../db/database';
import { useStorageStats } from '../services/useDownloads';
import { ACCENTS, APP_NAME, APP_TAGLINE, RECITERS, SCRIPT_STYLES } from '../lib/constants';
import { formatBytes } from '../lib/utils';
import { PageHeader } from '../components/ui/common';
import { Icon, type IconName } from '../components/ui/Icon';
import { Segmented, Slider, Toggle } from '../components/ui/controls';
import { Modal } from '../components/ui/Modal';
import { MihrabLogo } from '../components/ui/MihrabLogo';
import { createBackupJson, parseBackupJson, restoreBackup, type FurqanBackup } from '../lib/backup';

/* beforeinstallprompt is a Chromium-only event */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useAppSelector((s) => s.theme);
  const settings = useAppSelector((s) => s.settings);
  const progress = useAppSelector((s) => s.progress);
  const playlists = useAppSelector((s) => s.playlists);
  const favorites = useAppSelector((s) => s.favorites.items);
  const bookmarks = useAppSelector((s) => s.bookmarks.items);
  const storage = useStorageStats();
  const backupInputRef = useRef<HTMLInputElement>(null);

  const [confirmClearAudio, setConfirmClearAudio] = useState(false);
  const [confirmResetProgress, setConfirmResetProgress] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [pendingBackup, setPendingBackup] = useState<FurqanBackup | null>(null);

  const exportBackup = () => {
    try {
      const blob = new Blob([createBackupJson()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `furqan-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      dispatch(push('Your Furqan backup is ready.', 'success'));
    } catch {
      dispatch(push('Could not create a backup file.', 'error'));
    }
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const backup = parseBackupJson(await file.text());
      const progressMaps = [progress.lastRead, progress.lastListened, progress.surahCompleted,
        progress.juzCompleted, progress.dailyActivity, progress.ayahsReached, progress.milestones];
      const hasUserData = progress.lastPosition !== null || progress.activity.length > 0 ||
        progress.quoteHistory.length > 0 || progressMaps.some((records) => Object.keys(records).length > 0) ||
        favorites.length > 0 || bookmarks.length > 0 || playlists.playlists.some((playlist) =>
          playlist.createdAt > 0 || playlist.name !== 'My Playlist' || playlist.items.length > 0);
      if (hasUserData) {
        setPendingBackup(backup);
        return;
      }
      restoreBackup(backup);
      dispatch(push('Your data has been restored.', 'success'));
    } catch (error) {
      dispatch(push(error instanceof Error ? error.message : 'Could not read this backup file.', 'error'));
    }
  };

  const toggleNotification = async (key: 'daily' | 'fridayKahf' | 'nightlyMulk', enabled: boolean) => {
    if (!enabled) {
      dispatch(setNotificationPreference({ key, enabled: false }));
      return;
    }
    if (typeof Notification === 'undefined') {
      dispatch(push('Notifications are not supported in this browser.', 'error'));
      return;
    }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      dispatch(setNotificationPreference({ key, enabled: true }));
    } else {
      dispatch(push('Allow notifications in your browser to enable reminders.', 'info'));
    }
  };

  useEffect(() => {
    const onPrompt = (e: Event) => setInstallEvt(e as BeforeInstallPromptEvent);
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return (
    <div className="page-enter">
      <PageHeader title="Settings" subtitle="Theme, reading & playback preferences." />

      {/* ---- Appearance ---- */}
      <Section title="Appearance" icon="sun" />
      <Card>
        <div className="mb-1 text-xs font-medium text-mut">Colour mode</div>
        <Segmented
          value={theme.mode}
          onChange={(m) => dispatch(setMode(m))}
          options={[
            { value: 'system', label: 'System', icon: 'stack' },
            { value: 'light', label: 'Light', icon: 'sun' },
            { value: 'dark', label: 'Dark', icon: 'moon' },
            { value: 'sepia', label: 'Sepia', icon: 'sun' },
          ]}
        />
        <div className="mb-1 mt-4 text-xs font-medium text-mut">Accent colour</div>
        <div className="flex flex-wrap gap-2.5">
          {ACCENTS.map((a) => {
            const active = a.id === theme.accent;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => dispatch(setAccent(a.id))}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform pressable ${
                    active ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''
                  }`}
                  style={{ backgroundColor: a.swatch }}
                >
                  {active && <Icon name="check" size={16} className="text-white" />}
                </span>
                <span className={`text-[10px] ${active ? 'font-semibold text-ink' : 'text-mut'}`}>
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ---- Reading ---- */}
      <Section title="Reading" icon="book" />
      <Card>
        <Row
          label="Arabic text"
          control={<Toggle checked={settings.showArabic} onChange={(v) => dispatch(setShowArabic(v))} label="Arabic text" />}
        />
        <Row
          label="Transliteration"
          control={<Toggle checked={settings.showTransliteration} onChange={(v) => dispatch(setShowTransliteration(v))} label="Transliteration" />}
        />
        <Row
          label="English translation"
          control={<Toggle checked={settings.showTranslation} onChange={(v) => dispatch(setShowTranslation(v))} label="English translation" />}
        />
        <Row
          label="Follow playback"
          hint="Auto-scroll to the ayah being recited"
          control={<Toggle checked={settings.followAudio} onChange={(v) => dispatch(setFollowAudio(v))} label="Follow playback" />}
        />
        <Row
          label="Focus mode"
          hint="Hide navigation while reading"
          control={<Toggle checked={settings.readingMode} onChange={(v) => dispatch(setReadingMode(v))} label="Focus mode" />}
        />
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-mut">Arabic script</div>
          <Segmented
            value={settings.script}
            onChange={(v) => dispatch(setScript(v))}
            options={SCRIPT_STYLES.map((s) => ({ value: s.id, label: s.label }))}
          />
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-mut">
            <span>Arabic text size</span>
            <span className="tabular-nums">{(settings.arabicFontScale * 100).toFixed(0)}%</span>
          </div>
          <Slider
            min={1}
            max={3}
            step={0.05}
            value={settings.arabicFontScale}
            onChange={(v) => dispatch(setArabicFontScale(v))}
            ariaLabel="Arabic text size"
          />
        </div>
      </Card>

      {/* ---- Audio ---- */}
      <Section title="Audio" icon="music" />
      <Card>
        <div className="mb-1 text-xs font-medium text-mut">Default reciter</div>
        <select
          value={settings.defaultReciter}
          onChange={(e) => dispatch(setDefaultReciter(e.target.value))}
          className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
        >
          {RECITERS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} · {r.arabicName}
            </option>
          ))}
        </select>
      </Card>

      {/* ---- Storage & downloads ---- */}
      <Section title="Storage & Downloads" icon="download" />
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">Downloaded recitations</div>
            <div className="mt-0.5 text-xs text-mut">
              {storage.count === 0
                ? 'Nothing downloaded yet'
                : `${storage.count} surah${storage.count === 1 ? '' : 's'} stored on this device`}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold tabular-nums text-ink">{formatBytes(storage.bytes)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-mut">used</div>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-mut">
          {storage.count === 0
            ? 'No recitations are stored yet. '
            : `${formatBytes(storage.bytes)} used of downloaded recitations. `}
          Qur’an text is cached as you read, so surahs you have already opened stay readable without a
          connection. Audio is only stored when you download it, so it never fills your device on its
          own.
        </p>

        <button
          type="button"
          onClick={() => navigate('/downloads')}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-surface2 px-3.5 py-3 text-sm pressable"
        >
          <span className="inline-flex items-center gap-2 font-medium text-ink">
            <Icon name="download" size={16} className="text-accent" />
            Manage downloads
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-mut">
            {storage.count === 0 ? 'Add surahs' : 'Add or remove surahs'}
            <Icon name="forward" size={14} />
          </span>
        </button>

        {storage.count > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearAudio(true)}
            className="mt-2 flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm pressable"
          >
            <span className="inline-flex items-center gap-2 font-medium text-danger">
              <Icon name="trash" size={16} />
              Clear all downloaded audio
            </span>
            <span className="text-xs text-mut">{formatBytes(storage.bytes)}</span>
          </button>
        )}
      </Card>

      {/* ---- Reminders ---- */}
      <Section title="Reminders" icon="clock" />
      <Card>
        <p className="mb-3 text-xs leading-relaxed text-mut">
          Reminders are optional. Enabling one asks your browser for permission and shows the reminder while Furqan is available. The in-app check-in remains available when background notifications are limited.
        </p>
        <Row label="Daily Qur’an check-in" control={<Toggle checked={settings.notifications.daily} onChange={(v) => void toggleNotification('daily', v)} label="Daily Qur’an check-in" />} />
        <Row label="Friday · Surah Al-Kahf" control={<Toggle checked={settings.notifications.fridayKahf} onChange={(v) => void toggleNotification('fridayKahf', v)} label="Friday Surah Al-Kahf reminder" />} />
        <Row label="Nightly · Surah Al-Mulk" control={<Toggle checked={settings.notifications.nightlyMulk} onChange={(v) => void toggleNotification('nightlyMulk', v)} label="Nightly Surah Al-Mulk reminder" />} />
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <label htmlFor="reminder-time" className="text-sm font-medium text-ink">Reminder time</label>
          <input id="reminder-time" type="time" value={settings.notifications.reminderTime} disabled={notificationPermission !== 'granted'} onChange={(event) => dispatch(setReminderTime(event.target.value))} className="rounded-xl border border-line bg-surface2 px-3 py-2 text-sm text-ink disabled:opacity-50" />
        </div>
      </Card>

      {/* ---- Istiqamah progression ---- */}
      <Section title="Istiqamah progression" icon="sparkle" />
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">Current streak</div>
            <div className="mt-0.5 text-xs text-mut">
              Longest {progress.progression.highestStreak} days
              {progress.progression.streakFreezes > 0 ? ` · ${progress.progression.streakFreezes} streak freeze${progress.progression.streakFreezes === 1 ? '' : 's'}` : ''}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold tabular-nums text-ink">{progress.progression.currentStreak}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-mut">days</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-mut">
            <span>Your Istiqamah goal</span>
            <span className="tabular-nums">
              {Math.min(progress.progression.currentStreak, progress.progression.istiqamahGoal)}/{progress.progression.istiqamahGoal} days
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.min(100, (progress.progression.currentStreak / Math.max(1, progress.progression.istiqamahGoal)) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ISTIQAMAH_MILESTONES.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => dispatch(setIstiqamahGoal({ days }))}
                className={`rounded-full px-3 py-1.5 text-xs font-medium pressable ${
                  progress.progression.istiqamahGoal === days ? 'bg-accent text-onaccent' : 'bg-surface2 text-mut hover:text-ink'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs font-medium text-mut">Themes and badges</div>
        <div className="mt-2 space-y-2">
          {TIERS.map((tier) => {
            const unlocked = isTierUnlocked(progress.progression.currentStreak, tier);
            const { ratio, remaining } = tierProgress(progress.progression.currentStreak, tier);
            const applied =
              Boolean(tier.theme) &&
              (!tier.theme?.mode || theme.mode === tier.theme.mode) &&
              (!tier.theme?.accent || theme.accent === tier.theme.accent);
            return (
              <div
                key={tier.tier}
                className={`rounded-xl border p-3 ${unlocked ? 'border-accent/40 bg-accent/8' : 'border-line bg-surface2'}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                    style={{ backgroundColor: `${BADGE_TONES[tier.badge]}22`, color: BADGE_TONES[tier.badge] }}
                  >
                    {unlocked ? <Icon name="sparkle" size={18} /> : <span aria-hidden="true">🔒</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">
                      {tier.name} <span className="text-xs font-normal text-mut">· {tier.days} days</span>
                    </div>
                    <div className="text-xs text-mut">{tier.unlocks}</div>
                  </div>
                  {unlocked && tier.theme && (
                    <button
                      type="button"
                      onClick={() => {
                        if (tier.theme?.mode) dispatch(setMode(tier.theme.mode));
                        if (tier.theme?.accent) dispatch(setAccent(tier.theme.accent));
                      }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold pressable ${
                        applied ? 'bg-surface2 text-mut' : 'bg-accent text-onaccent'
                      }`}
                    >
                      {applied ? 'Applied' : 'Apply'}
                    </button>
                  )}
                  {unlocked && !tier.theme && (
                    <span className="shrink-0 rounded-full bg-surface2 px-3 py-1.5 text-xs font-semibold text-accent">Unlocked</span>
                  )}
                </div>

                {!unlocked && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-mut">
                      <span>Locked: reach {tier.days} days to unlock</span>
                      <span className="tabular-nums">Current: {progress.progression.currentStreak}/{tier.days}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface3">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${ratio * 100}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-mut">
                      {remaining} day{remaining === 1 ? '' : 's'} to go
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-line2 p-3">
          <div className="text-xs font-medium text-mut">Developer test controls</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch(devAddStreakDays({ days: 7 }))}
              className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium text-ink pressable"
            >
              Add +7 Days
            </button>
            <button
              type="button"
              onClick={() => dispatch(devSetStreak({ days: 364 }))}
              className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium text-ink pressable"
            >
              Set Streak to 364
            </button>
            <button
              type="button"
              onClick={() => dispatch(devResetStreak())}
              className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium text-ink pressable"
            >
              Reset Streak
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-mut">
            These simulate streak days so the tier locks and unlock celebrations can be tested without waiting.
          </p>
        </div>
      </Card>

      {/* ---- Data ---- */}
      <Section title="Data" icon="settings" />
      <Card>
        <p className="mb-3 text-xs leading-relaxed text-mut">
          Keep a copy in case you get a new phone or reinstall Furqan. Downloaded audio is not included and can be saved again.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportBackup}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable"
          >
            <Icon name="download" size={16} />
            Back up your data
          </button>
          <button
            type="button"
            onClick={() => backupInputRef.current?.click()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold text-ink pressable"
          >
            <Icon name="refresh" size={16} />
            Restore backup
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              void importBackup(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setConfirmResetProgress(true)}
          className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm pressable"
        >
          <span className="inline-flex items-center gap-2 font-medium text-danger">
            <Icon name="refresh" size={16} />
            Reset reading progress
          </span>
        </button>
      </Card>

      {/* ---- About ---- */}
      <Section title={`About ${APP_NAME}`} icon="info" />
      <Card>
        <div className="mb-4 flex flex-col items-center gap-2">
          <MihrabLogo size={80} />
          <div className="text-center">
            <div className="text-sm font-semibold text-ink">{APP_NAME}</div>
            <div className="text-[11px] text-mut">الفرقان · {APP_TAGLINE}</div>
          </div>
        </div>
        <div className="text-sm leading-relaxed text-mut">
          <p>
            <b className="text-ink">{APP_NAME}</b> is a Qur’an app for reading, listening and
            learning — read all 114 surahs (Arabic, translation & transliteration), build custom
            multi-surah playlists with repeat counts, listen to multiple reciters, save recitations
            for offline listening, and follow uplifting sayings — all without a connection once
            loaded.
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>· Qur’an text/translation: Tanzil.net via Al Quran Cloud (quran-uthmani, en.sahih, en.transliteration)</li>
            <li>· Recitations: islamic.network audio CDN — downloaded files are stored only on this device</li>
            <li>· Arabic fonts: Amiri Quran, Noto Naskh & Scheherazade New (OFL)</li>
          </ul>
          {installEvt && (
            <button
              type="button"
              onClick={async () => {
                await installEvt.prompt();
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-onaccent pressable"
            >
              <Icon name="download" size={16} />
              Install app
            </button>
          )}
          <p className="mt-3 text-center text-[11px] text-mut">
            {APP_NAME} v1.0.0 · الفرقان · made for reading & reflection
          </p>
        </div>
      </Card>

      {/* confirm clear audio */}
      <Modal open={confirmClearAudio} onClose={() => setConfirmClearAudio(false)} title="Clear downloaded audio?">
        <p className="text-sm text-mut">
          Removes {storage.count} stored audio file{storage.count === 1 ? '' : 's'} ({formatBytes(storage.bytes)}) from
          this device. Re-download anytime.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmClearAudio(false)}
            className="rounded-full px-4 py-2 text-sm font-medium text-mut hover:bg-surface2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await db.audio.clear();
              setConfirmClearAudio(false);
              dispatch(push('Downloaded audio cleared.', 'info'));
            }}
            className="rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"
          >
            Clear
          </button>
        </div>
      </Modal>

      {/* confirm reset progress */}
      <Modal open={confirmResetProgress} onClose={() => setConfirmResetProgress(false)} title="Reset reading progress?">
        <p className="text-sm text-mut">
          Clears saved positions, completed surahs/juz and listening history. Playlists & downloads are kept.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmResetProgress(false)}
            className="rounded-full px-4 py-2 text-sm font-medium text-mut hover:bg-surface2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(clearAllProgress());
              setConfirmResetProgress(false);
              dispatch(push('Progress reset.', 'info'));
            }}
            className="rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"
          >
            Reset
          </button>
        </div>
      </Modal>

      <Modal open={pendingBackup !== null} onClose={() => setPendingBackup(null)} title="Replace your data?">
        <p className="text-sm leading-relaxed text-mut">
          This will replace your current progress, settings, theme and playlists with the contents of this backup. Continue?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setPendingBackup(null)}
            className="rounded-full px-4 py-2 text-sm font-medium text-mut hover:bg-surface2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!pendingBackup) return;
              restoreBackup(pendingBackup);
              setPendingBackup(null);
              dispatch(push('Your data has been restored.', 'success'));
            }}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent"
          >
            Restore data
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- small helpers ---------- */
function Section({ title, icon }: { title: string; icon: IconName }) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-1.5 text-sm font-semibold text-ink first:mt-0">
      <Icon name={icon} size={16} className="text-accent" />
      {title}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-line bg-surface p-3.5">{children}</div>;
}

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint && <div className="text-xs text-mut">{hint}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
