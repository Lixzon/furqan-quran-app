import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppSelector } from './store';
import { QuranProvider } from './data/QuranProvider';
import { ThemeManager } from './components/layout/ThemeManager';
import { AppLayout } from './components/layout/AppLayout';
import { ToastHost } from './components/ui/ToastHost';

import BrowsePage from './pages/BrowsePage';
import SurahReader from './pages/SurahReader';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistDetailPage from './pages/PlaylistDetailPage';
import NowPlayingPage from './pages/NowPlayingPage';
import QuotesPage from './pages/QuotesPage';
import ProgressPage from './pages/ProgressPage';
import DownloadsPage from './pages/DownloadsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = pathname.startsWith('/surah/')
      ? 'Reading · Furqan'
      : 'Furqan — Offline Qur’an';
  }, [pathname]);

  return (
    <QuranProvider>
      <ThemeManager />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<BrowsePage />} />
          <Route path="surah/:number" element={<SurahReader />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="playlist/:id" element={<PlaylistDetailPage />} />
          <Route path="player" element={<NowPlayingPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="downloads" element={<DownloadsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ToastHost />
      <ReminderHost />
    </QuranProvider>
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
        if (localStorage.getItem(`furqan:reminder:${key}:${date}`)) return;
        const notification = new Notification(title, { body, tag: `furqan-${key}` });
        notification.onclick = () => {
          window.focus();
          window.location.href = path;
        };
        localStorage.setItem(`furqan:reminder:${key}:${date}`, '1');
      };

      if (currentMinutes < reminderMinutes) return;
      if (notifications.daily && !dailyActivity[date]) {
        show('daily', 'A moment with the Qur’an', 'Have you read your Qur’an today?', '/');
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
