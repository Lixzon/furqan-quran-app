import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { Sidebar, MobileNav } from './nav';
import { MiniPlayer } from './MiniPlayer';
import { TopBar } from './TopBar';

export function AppLayout() {
  const readingMode = useAppSelector((s) => s.settings.readingMode);
  const location = useLocation();

  // scroll the window to the top on navigation (reader restores its own position)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      {!readingMode && <Sidebar />}
      <div className={readingMode ? '' : 'md:pl-60'}>
        <TopBar />
        <main
          className={`mx-auto w-full max-w-3xl px-4 ${readingMode ? 'safe-t pt-6' : 'pt-4'} ${readingMode ? 'layout-bottom-reading' : 'layout-bottom-default'}`}
        >
          <Outlet />
        </main>
      </div>
      <MiniPlayer />
      <MobileNav />
    </div>
  );
}
