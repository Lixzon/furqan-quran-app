import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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
    </QuranProvider>
  );
}
