import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppSelector } from './store';
import { QuranProvider } from './data/QuranProvider';
import { ThemeManager } from './components/layout/ThemeManager';
import { AppLayout } from './components/layout/AppLayout';
import { ToastHost } from './components/ui/ToastHost';
import { ErrorBoundary } from './components/ErrorBoundary';
import { APP_NAME, APP_TAGLINE } from './lib/constants';
import { islamicQuoteOfTheDay } from './data/quotes';
import { todayKey } from './lib/progression';
import { ProgressionHost } from './components/layout/ProgressionHost';
import { VoiceSearchProvider } from './components/search/VoiceSearchModal';
import { VoiceMatchDrawer, VoiceMatchBackPill } from './components/VoiceMatchDrawer';

import BrowsePage from './pages/BrowsePage';
import LibraryPage from './pages/LibraryPage';
import SurahReader from './pages/SurahReader';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistDetailPage from './pages/PlaylistDetailPage';
import NowPlayingPage from './pages/NowPlayingPage';
import GuidancePage from './pages/GuidancePage';
import ProgressPage from './pages/ProgressPage';
import DownloadsPage from './pages/DownloadsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = pathname.startsWith('/surah/')
      ? `Reading · ${APP_NAME}`
      : `${APP_NAME} — ${APP_TAGLINE}`;
  }, [pathname]);

  return (
    <ErrorBoundary>
      <QuranProvider>
        <VoiceSearchProvider>
          <ThemeManager />
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<BrowsePage />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="surah/:number" element={<SurahReader />} />
              <Route path="playlists" element={<PlaylistsPage />} />
              <Route path="playlist/:id" element={<PlaylistDetailPage />} />
              <Route path="player" element={<NowPlayingPage />} />
              <Route path="guidance" element={<GuidancePage />} />
              <Route path="quotes" element={<Navigate to="/guidance?tab=sayings" replace />} />
              <Route path="favorites" element={<LegacyFavoritesRedirect />} />
              <Route path="bookmarks" element={<Navigate to="/library?tab=ayah&section=favorites" replace />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="downloads" element={<DownloadsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <ToastHost />
          <ReminderHost />
          <ProgressionHost />
          <VoiceMatchDrawer />
          <VoiceMatchBackPill />
        </VoiceSearchProvider>
      </QuranProvider>
    </ErrorBoundary>
  );
}

function LegacyFavoritesRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('section', 'favorites');
  if (params.get('tab') === 'ayahs') params.set('tab', 'ayah');
  return <Navigate to={`/library?${params.toString()}`} replace />;
}

function ReminderHost() {
  const notifications = useAppSelector((s) => s.settings.notifications);
  const dailyActivity = useAppSelector((s) => s.progress.dailyActivity);

  useEffect(() => {
    const check = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const now = new Date();
      const date = todayKey();
      const [hour, minute] = notifications.reminderTime.split(':').map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const reminderMinutes = (hour || 0) * 60 + (minute || 0);
      const show = (key: string, title: string, body: string, path: string) => {
        try {
          if (localStorage.getItem(`furqan:reminder:${key}:${date}`)) return;
        } catch {
          return;
        }

        const notify = async () => {
          try {
            const options = { body, tag: `furqan-${key}` };
            const registration = await navigator.serviceWorker?.getRegistration();
            if (registration) {
              if (!registration.active) return;
              await registration.showNotification(title, options);
            } else {
              const notification = new Notification(title, options);
              notification.onclick = () => {
                window.focus();
                window.location.href = path;
              };
            }
          } catch {
            // Notifications may be unavailable in restricted browser contexts.
          }
        };
        void notify();

        try {
          localStorage.setItem(`furqan:reminder:${key}:${date}`, '1');
        } catch {
          // ignore storage failures when the browser blocks writes
        }
      };

      if (currentMinutes < reminderMinutes) return;
      if (notifications.daily && !dailyActivity[date]) {
        const quote = islamicQuoteOfTheDay(new Date());
        show('daily', 'Your Quran streak is waiting! 🔥', quote.text, '/');
      }
      if (notifications.nightlyMulk) {
        show('mulk', 'Surah Al-Mulk', 'Take a few minutes with Surah Al-Mulk.', '/surah/67');
      }
      if (notifications.fridayKahf && now.getDay() === 5) {
        show('kahf', 'Friday reminder', 'Spend a moment with Surah Al-Kahf.', '/surah/18');
      }
    };
    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [notifications, dailyActivity]);

  return null;
}
