import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from './store';
import { useAppDispatch } from './store';
import { setDefaultReciterOfferSeen, setWifiDownloadPending } from './store/slices/settingsSlice';
import { QuranProvider } from './data/QuranProvider';
import { ThemeManager } from './components/layout/ThemeManager';
import { AppLayout } from './components/layout/AppLayout';
import { ToastHost } from './components/ui/ToastHost';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Modal } from './components/ui/Modal';
import { Icon } from './components/ui/Icon';
import { RECITERS } from './lib/constants';
import { APP_NAME, APP_TAGLINE } from './lib/constants';
import { islamicQuoteOfTheDay } from './data/quotes';
import { ProgressionHost } from './components/layout/ProgressionHost';
import { VoiceSearchProvider } from './components/search/VoiceSearchModal';

import BrowsePage from './pages/BrowsePage';
import SurahReader from './pages/SurahReader';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistDetailPage from './pages/PlaylistDetailPage';
import NowPlayingPage from './pages/NowPlayingPage';
import QuotesPage from './pages/QuotesPage';
import ProgressPage from './pages/ProgressPage';
import DownloadsPage from './pages/DownloadsPage';
import SettingsPage from './pages/SettingsPage';
import BookmarksPage from './pages/BookmarksPage';
import FavoritesPage from './pages/FavoritesPage';

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
              <Route path="surah/:number" element={<SurahReader />} />
              <Route path="playlists" element={<PlaylistsPage />} />
              <Route path="playlist/:id" element={<PlaylistDetailPage />} />
              <Route path="player" element={<NowPlayingPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              {/* The bookmarks page is now the Ayahs tab of the Favourites hub. */}
              <Route path="bookmarks" element={<Navigate to="/favorites?tab=ayahs" replace />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="downloads" element={<DownloadsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <ToastHost />
          <ReminderHost />
          <ProgressionHost />
          <DefaultReciterOffer />
        </VoiceSearchProvider>
      </QuranProvider>
    </ErrorBoundary>
  );
}

interface NetworkInformation extends EventTarget {
  type?: string;
}

function DefaultReciterOffer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const settings = useAppSelector((s) => s.settings);
  const [open, setOpen] = useState(false);
  const deferredThisSession = useRef(false);

  useEffect(() => {
    if (settings.wifiDownloadPending) {
      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      if (!connection || typeof connection.type !== 'string' || connection.type === 'unknown') {
        if (deferredThisSession.current) return;
        dispatch(setWifiDownloadPending(false));
        setOpen(true);
        return;
      }

      const startWhenOnWifi = () => {
        if (connection.type !== 'wifi') return;
        dispatch(setWifiDownloadPending(false));
        navigate('/downloads?downloadAll=1');
      };
      startWhenOnWifi();
      if (connection.type !== 'wifi') {
        connection.addEventListener('change', startWhenOnWifi);
        return () => connection.removeEventListener('change', startWhenOnWifi);
      }
      return;
    }

    if (!settings.hasOfferedDefaultReciterDownload) {
      dispatch(setDefaultReciterOfferSeen());
      setOpen(true);
    }
  }, [dispatch, navigate, settings.hasOfferedDefaultReciterDownload, settings.wifiDownloadPending]);

  const startDownload = () => {
    dispatch(setWifiDownloadPending(false));
    setOpen(false);
    navigate('/downloads?downloadAll=1');
  };

  const deferToWifi = () => {
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (!connection || typeof connection.type !== 'string' || connection.type === 'unknown') {
      deferredThisSession.current = true;
    }
    dispatch(setWifiDownloadPending(true));
    setOpen(false);
  };

  const reciter = RECITERS.find((item) => item.id === settings.defaultReciter) ?? RECITERS[0];
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Download recitation">
      <p className="text-sm leading-relaxed text-mut">
        Download {reciter.label}’s complete recitation, approximately 700 MB, for offline listening. Best on Wi-Fi.
      </p>
      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={startDownload}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable"
        >
          <Icon name="download" size={16} />
          Download now
        </button>
        <button
          type="button"
          onClick={deferToWifi}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold text-ink pressable"
        >
          <Icon name="wifi" size={16} />
          Only on Wi-Fi
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm font-medium text-mut">
          Not now
        </button>
      </div>
    </Modal>
  );
}

function ReminderHost() {
  const notifications = useAppSelector((s) => s.settings.notifications);
  const dailyActivity = useAppSelector((s) => s.progress.dailyActivity);

  useEffect(() => {
    const check = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
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
