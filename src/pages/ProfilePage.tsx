import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { PageHeader } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { totalLikedItems } from '../store/slices/likesSlice';
import { setDownloadQuality, setNotificationPreference, setScript, setShowArabic, setShowTranslation } from '../store/slices/settingsSlice';
import { DOWNLOAD_QUALITY_OPTIONS } from '../lib/constants';

export default function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const progress = useAppSelector((s) => s.progress);
  const settings = useAppSelector((s) => s.settings);
  const likes = useAppSelector((s) => totalLikedItems(s.likes));
  const bookmarks = useAppSelector((s) => s.bookmarks.items.length);
  const playlists = useAppSelector((s) => s.playlists.playlists.length);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const streak = progress.progression.currentStreak;
  const completedSurahs = Object.keys(progress.surahCompleted).filter((key) => progress.surahCompleted[Number(key)]).length;
  const completedJuz = Object.keys(progress.juzCompleted).filter((key) => progress.juzCompleted[Number(key)]).length;
  const badges = [
    { label: 'Streak', value: `${streak}d` },
    { label: 'Goals', value: `${progress.progression.celebratedMilestones.length}x` },
    { label: 'Tiers', value: `${progress.progression.unlockedTiers.length}` },
    { label: 'Reader', value: settings.script.toUpperCase() },
  ];

  const recentHistory = progress.activity.slice(0, 4);

  return (
    <div className="page-enter">
      <PageHeader
        title="Profile"
        subtitle="Your reading routine, badges and preferences."
        right={
          <button
            type="button"
            aria-label="Open settings"
            onClick={() => setSettingsOpen(true)}
            className="pressable inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-ink"
          >
            <Icon name="settings" size={18} />
          </button>
        }
      />

      <div className="mb-4 rounded-3xl border border-accent/30 bg-accent/8 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Reader profile</div>
            <div className="mt-1 text-xl font-bold text-ink">You are building consistency</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-onaccent">
            <Icon name="user" size={22} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge.label} className="rounded-full border border-accent/25 bg-surface/70 px-3 py-1.5 text-[11px] font-semibold text-ink">
              {badge.label}: {badge.value}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard icon="book" label="Streak" value={`${streak} days`} />
        <StatCard icon="stack" label="Juz" value={`${completedJuz}/30`} />
        <StatCard icon="sparkle" label="Surahs" value={`${completedSurahs}`} />
        <StatCard icon="heart" label="Saved" value={`${likes + bookmarks}`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <InfoCard title="Playlists" value={String(playlists)} subtitle="Curated collections" icon="list" />
        <InfoCard title="Bookmarks" value={String(bookmarks)} subtitle="Saved ayahs" icon="book" />
        <InfoCard title="Progress" value={`${Math.min(100, Math.round((completedJuz / 30) * 100))}%`} subtitle="Juz complete" icon="progress" />
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-ink">Istiqamah history</div>
          <button type="button" onClick={() => navigate('/progress')} className="text-xs font-medium text-accent">
            View full progress
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <div className="text-sm text-mut">No recent activity yet. Start with a short reading session.</div>
        ) : (
          <div className="space-y-2">
            {recentHistory.map((entry) => (
              <div key={`${entry.surah}-${entry.ayah}-${entry.at}`} className="flex items-center justify-between rounded-xl bg-surface2 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-ink">{entry.name}</div>
                  <div className="text-[11px] text-mut">Ayah {entry.ayah} · {entry.kind}</div>
                </div>
                <div className="text-[11px] text-muted">{new Date(entry.at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} size="lg" title={
        <span className="inline-flex items-center gap-2">
          <Icon name="settings" size={18} className="text-accent" />
          Preferences
        </span>
      }>
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-mut">Download quality</div>
            <div className="grid grid-cols-3 gap-2">
              {DOWNLOAD_QUALITY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => dispatch(setDownloadQuality(option.id))}
                  className={`rounded-xl border px-2 py-2 text-left ${
                    settings.downloadQuality === option.id ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface2 text-ink'
                  }`}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className="text-[11px] opacity-80">{option.bitrate}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-mut">Daily check-ins</div>
            <div className="space-y-2">
              {[
                { key: 'daily', label: 'Daily reminder', active: settings.notifications.daily },
                { key: 'fridayKahf', label: 'Friday Kahf', active: settings.notifications.fridayKahf },
                { key: 'nightlyMulk', label: 'Nightly Mulk', active: settings.notifications.nightlyMulk },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => dispatch(setNotificationPreference({ key: item.key as 'daily' | 'fridayKahf' | 'nightlyMulk', enabled: !item.active }))}
                  className="flex w-full items-center justify-between rounded-xl border border-line bg-surface2 px-3 py-2 text-left pressable"
                >
                  <span className="text-sm font-medium text-ink">{item.label}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.active ? 'bg-accent text-onaccent' : 'bg-surface text-mut'}`}>
                    {item.active ? 'On' : 'Off'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-mut">Reading preferences</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => dispatch(setScript('uthmani'))} className={`rounded-xl border px-3 py-2 text-sm font-medium ${settings.script === 'uthmani' ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface2 text-ink'}`}>
                Uthmani
              </button>
              <button type="button" onClick={() => dispatch(setScript('naskh'))} className={`rounded-xl border px-3 py-2 text-sm font-medium ${settings.script === 'naskh' ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface2 text-ink'}`}>
                Naskh
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => dispatch(setShowArabic(!settings.showArabic))} className={`rounded-xl border px-3 py-2 text-sm font-medium ${settings.showArabic ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface2 text-ink'}`}>
                Arabic {settings.showArabic ? 'On' : 'Off'}
              </button>
              <button type="button" onClick={() => dispatch(setShowTranslation(!settings.showTranslation))} className={`rounded-xl border px-3 py-2 text-sm font-medium ${settings.showTranslation ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface2 text-ink'}`}>
                Translation {settings.showTranslation ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: 'book' | 'stack' | 'sparkle' | 'heart'; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-accent/12 text-accent">
        <Icon name={icon} size={18} />
      </div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-mut">{label}</div>
      <div className="mt-1 text-lg font-bold text-ink">{value}</div>
    </div>
  );
}

function InfoCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: 'list' | 'book' | 'progress' }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-surface2 text-accent">
        <Icon name={icon} size={18} />
      </div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-mut">{title}</div>
      <div className="mt-1 text-xl font-bold text-ink">{value}</div>
      <div className="text-sm text-mut">{subtitle}</div>
    </div>
  );
}
