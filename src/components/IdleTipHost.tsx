import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { Icon } from './ui/Icon';

const IDLE_MS = 45_000;
const DISMISS_KEY = 'furqan:idle-tip-dismissed';

/**
 * A single, quiet feature tip that appears only when nothing is happening:
 * no recitation playing and no touch, key or scroll activity for 45 seconds.
 * Dismissing it silences the tip across app sessions.
 */
export function IdleTipHost() {
  const isPlaying = useAppSelector((s) => s.player.isPlaying);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dismissedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      dismissedRef.current = localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      /* private mode: keep the tip available until this app session ends */
    }
  }, []);

  useEffect(() => {
    if (isPlaying || dismissedRef.current || pathname === '/player' || pathname === '/support' || pathname.startsWith('/surah/')) {
      setVisible(false);
      return;
    }

    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      setVisible(false);
      timer = window.setTimeout(() => setVisible(true), IDLE_MS);
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, arm, { passive: true }));
    arm();

    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, arm));
    };
  }, [isPlaying, pathname]);

  const dismiss = () => {
    dismissedRef.current = true;
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore storage failures */
    }
  };

  if (!visible || isPlaying) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="anim-fade fixed inset-x-3 z-40 mx-auto max-w-md rounded-2xl border border-line bg-surface/95 p-3 shadow-card backdrop-blur"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8.5rem)' }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
          <Icon name="sparkle" size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-ink">Memorise a verse range</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-mut">
            Loop any ayah window in the player for uninterrupted Hifz repetition.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                dismiss();
                navigate('/player');
              }}
              className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-onaccent"
            >
              Open player
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-3 py-1 text-[11px] font-medium text-mut hover:bg-surface2 hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
