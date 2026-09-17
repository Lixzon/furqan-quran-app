import { useEffect, useState, type ReactNode } from 'react';
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
} from '../store/slices/settingsSlice';
import { clearAllProgress } from '../store/slices/progressSlice';
import { db } from '../db/database';
import { useStorageStats } from '../services/useDownloads';
import { ACCENTS, APP_NAME, RECITERS, SCRIPT_STYLES } from '../lib/constants';
import { formatBytes } from '../lib/utils';
import { PageHeader } from '../components/ui/common';
import { Icon, type IconName } from '../components/ui/Icon';
import { Segmented, Slider, Toggle } from '../components/ui/controls';
import { Modal } from '../components/ui/Modal';

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
  const storage = useStorageStats();

  const [confirmClearAudio, setConfirmClearAudio] = useState(false);
  const [confirmResetProgress, setConfirmResetProgress] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);

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
        <button
          type="button"
          onClick={() => navigate('/downloads')}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-surface2 px-3.5 py-3 text-sm pressable"
        >
          <span className="inline-flex items-center gap-2 font-medium text-ink">
            <Icon name="download" size={16} className="text-accent" />
            Offline downloads
          </span>
          <span className="text-xs tabular-nums text-mut">
            {storage.count} file{storage.count === 1 ? '' : 's'} · {formatBytes(storage.bytes)}
          </span>
        </button>
      </Card>

      {/* ---- Data ---- */}
      <Section title="Data" icon="settings" />
      <Card>
        <button
          type="button"
          onClick={() => setConfirmClearAudio(true)}
          className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm pressable"
        >
          <span className="inline-flex items-center gap-2 font-medium text-danger">
            <Icon name="trash" size={16} />
            Clear all downloaded audio
          </span>
          <span className="text-xs text-mut">{formatBytes(storage.bytes)}</span>
        </button>
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
        <div className="text-sm leading-relaxed text-mut">
          <p>
            <b className="text-ink">{APP_NAME}</b> is an offline-first Qur’an app — read all 114
            surahs (Arabic, translation & transliteration), build custom multi-surah playlists with
            repeat counts, listen to multiple reciters, save recitations for offline listening, and
            follow uplifting sayings — all without a connection once loaded.
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
