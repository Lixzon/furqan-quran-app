import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { Sidebar, MobileNav } from './nav';
import { MiniPlayer } from './MiniPlayer';

export function AppLayout() {
  const readingMode = useAppSelector((s) => s.settings.readingMode);
  const location = useLocation();

  // scroll the window to the top on navigation (reader restores its own position)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-base text-ink">
      {!readingMode && <Sidebar />}
      <div className={readingMode ? '' : 'md:pl-60'}>
        <main
          className="safe-t mx-auto w-full max-w-3xl px-4 pt-4"
          style={{ paddingBottom: readingMode ? '5rem' : '11.5rem' }}
        >
          <Outlet />
        </main>
      </div>
      <MiniPlayer />
      <MobileNav />
    </div>
  );
}
