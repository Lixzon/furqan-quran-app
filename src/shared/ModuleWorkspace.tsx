import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

const MishkaSection = lazy(() => import('../modules/guidance'));
const FurqanSection = lazy(() => import('../modules/quran'));

export function ModuleWorkspace() {
  const { pathname } = useLocation();
  const furqanActive = pathname === '/quran' || pathname.startsWith('/surah/');
  const moduleRoute = pathname === '/' || pathname === '/journey' || pathname === '/quran';

  return (
    <div className={moduleRoute ? '' : 'hidden'}>
      <div className={furqanActive ? 'hidden' : ''} aria-hidden={furqanActive}>
        <Suspense fallback={<div className="p-6 text-center text-sm text-muted" role="status">Loading Mishka…</div>}>
          <MishkaSection />
        </Suspense>
      </div>
      <div className={furqanActive ? '' : 'hidden'} aria-hidden={!furqanActive}>
        <Suspense fallback={<div className="p-6 text-center text-sm text-muted" role="status">Loading Furqan…</div>}>
          <FurqanSection />
        </Suspense>
      </div>
    </div>
  );
}
