import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';
import { MihrabLogo } from '../components/ui/MihrabLogo';
import { useAppDispatch } from '../store';
import { push } from '../store/slices/toastSlice';
import { appSectionForPath, type AppSection } from './sectionNavigation';
import { preloadSectionDestination } from './sectionPreload';

interface SwitchRequest {
  target: AppSection;
  destination?: string;
  prompt?: string;
}

interface SectionSwitcherContextValue {
  requestSwitch: (target: AppSection, destination?: string, prompt?: string) => void;
}

const SectionSwitcherContext = createContext<SectionSwitcherContextValue | null>(null);

export function SectionSwitcherProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [request, setRequest] = useState<SwitchRequest | null>(null);
  const [transition, setTransition] = useState<{ from: AppSection; to: AppSection } | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const requestSwitch = useCallback((target: AppSection, destination?: string, prompt?: string) => {
    if (target === appSectionForPath(window.location.pathname)) return;
    const targetDestination = destination ?? (target === 'mishka' ? '/journey' : '/quran');
    setRequest({ target, destination: targetDestination, prompt });
  }, []);

  const closeRequest = useCallback(() => setRequest(null), []);
  const confirmSwitch = useCallback(async () => {
    if (!request) return;
    const from = appSectionForPath(window.location.pathname);
    const target = request.target;
    const destination = request.destination ?? (target === 'mishka' ? '/journey' : '/quran');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 100 : 1650;

    setRequest(null);
    setTransition({ from, to: target });
    const startedAt = performance.now();
    try {
      await preloadSectionDestination(target, destination);
    } catch (error) {
      dispatch(push(
        `Could not preload ${target === 'mishka' ? 'Mishka' : 'Furqan'}; continuing to the destination.`,
        'error',
      ));
      console.error('Could not preload the destination module.', error);
    }
    const remaining = Math.max(0, duration - (performance.now() - startedAt));
    timeoutRef.current = window.setTimeout(() => {
      navigate(destination);
      timeoutRef.current = window.setTimeout(() => setTransition(null), reducedMotion ? 0 : 250);
    }, remaining);
  }, [dispatch, navigate, request]);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const value = useMemo(() => ({ requestSwitch }), [requestSwitch]);
  const fromName = request?.target === 'mishka' ? 'Furqan' : 'Mishka';
  const toName = request?.target === 'mishka' ? 'Mishka' : 'Furqan';
  const transitionFrom = transition?.from === 'mishka' ? 'Mishka' : 'Furqan';
  const transitionTo = transition?.to === 'mishka' ? 'Mishka' : 'Furqan';

  return (
    <SectionSwitcherContext.Provider value={value}>
      {children}
      <Modal
        open={request !== null}
        onClose={closeRequest}
        title={request?.prompt ?? `Do you want to switch to ${toName}?`}
        size="sm"
        variant="frosted"
        preserveBackground
        footer={
          <div className="flex justify-end gap-2">
              <button type="button" onClick={closeRequest} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink">
                Cancel
            </button>
            <button type="button" onClick={confirmSwitch} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-onaccent">
              Switch to {toName}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-mut">
          You’ll move from {fromName} to {toName}. Your place in each experience stays ready when you return.
        </p>
      </Modal>
      {transition ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-canvas/95 px-6 text-center backdrop-blur-xl anim-fade" role="status" aria-live="polite">
          <div className="page-enter">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-line bg-surface shadow-card">
              {transition.to === 'mishka'
                ? <img src="/mishka-logo.svg" alt="" className="h-16 w-16" />
                : <MihrabLogo size={64} />}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Manāra</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Switching from {transitionFrom} to {transitionTo}…</h2>
            <p className="mt-2 text-sm text-mut">Preparing your destination and restoring your place.</p>
            <div className="mx-auto mt-5 flex w-fit items-center gap-2 text-xs font-medium text-mut">
              <Icon name="refresh" size={15} className="animate-spin" />
              <span>One moment</span>
            </div>
          </div>
        </div>
      ) : null}
    </SectionSwitcherContext.Provider>
  );
}

export function useSectionSwitcher(): SectionSwitcherContextValue {
  const context = useContext(SectionSwitcherContext);
  if (!context) throw new Error('useSectionSwitcher must be used within SectionSwitcherProvider');
  return context;
}

export function SwitchAppsButton({ className = '' }: { className?: string }) {
  const { requestSwitch } = useSectionSwitcher();
  const { pathname } = useLocation();
  const tooltipId = useId();
  const current = appSectionForPath(pathname);
  const target = current === 'mishka' ? 'furqan' : 'mishka';
  const destinationLabel = target === 'mishka' ? 'Mishka' : 'Furqan';

  return (
    <button
      type="button"
      onClick={() => requestSwitch(target)}
      aria-label="Switch Apps"
      aria-describedby={tooltipId}
      title="Switch Apps"
      className={`switch-apps-button group pressable relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent transition hover:scale-105 hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current/35 transition group-hover:rotate-[-35deg]">
        <Icon name="refresh" size={12} />
      </span>
      <span id={tooltipId} role="tooltip" className="switch-apps-tooltip pointer-events-none absolute left-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-canvas shadow-card">
        Switch Apps
      </span>
      <span className="sr-only">Switch to {destinationLabel}</span>
    </button>
  );
}
