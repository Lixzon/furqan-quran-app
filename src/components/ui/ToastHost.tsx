import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { dismiss, selectToasts } from '../../store/slices/toastSlice';
import { Icon, type IconName } from './Icon';

const KIND_STYLES: Record<string, { icon: IconName; ring: string }> = {
  info: { icon: 'info', ring: 'text-accent' },
  success: { icon: 'check', ring: 'text-accent' },
  error: { icon: 'warning', ring: 'text-danger' },
};

export function ToastHost() {
  const items = useAppSelector(selectToasts);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((t) =>
      window.setTimeout(() => dispatch(dismiss(t.id)), 3400),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join(',')]);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4">
      {items.map((t) => {
        const st = KIND_STYLES[t.kind] ?? KIND_STYLES.info;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dispatch(dismiss(t.id))}
            className={`pointer-events-auto anim-pop flex max-w-sm items-start gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-card ${st.ring}`}
          >
            <span className="mt-0.5">
              <Icon name={st.icon} size={18} />
            </span>
            <span className="text-sm text-ink">{t.message}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
