import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** Lightweight modal / bottom sheet. Renders into a portal overlay. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  dismissable = true,
  size = 'md',
  variant = 'default',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  dismissable?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'frosted';
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitialElement = () => {
      const initialElement = dialogRef.current?.querySelector<HTMLElement>('[autofocus]');
      (initialElement ?? closeButtonRef.current)?.focus();
    };
    const frame = requestAnimationFrame(focusInitialElement);

    return () => {
      cancelAnimationFrame(frame);
      if (openerRef.current?.isConnected) openerRef.current.focus();
      openerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, dismissable]);

  useEffect(() => {
    if (!open || variant !== 'frosted') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, variant]);

  if (!open) return null;
  const widths: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  if (variant === 'frosted') {
    const frostedWidth = size === 'md' ? 'max-w-sm' : widths[size];
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="frosted-overlay absolute inset-0 bg-black/30 backdrop-blur-md anim-fade"
          onClick={() => (dismissable ? onClose() : undefined)}
          aria-hidden="true"
        />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          className={`frosted-panel relative w-full ${frostedWidth} max-h-[80vh] overflow-hidden rounded-3xl border border-white/10 bg-surface/80 shadow-card backdrop-blur-2xl anim-pop-center`}
        >
          <div className="flex items-center justify-between border-b border-line/80 px-5 py-4">
            <div className="text-base font-semibold text-ink">{title}</div>
            {dismissable && (
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="pressable rounded-full p-1.5 text-mut hover:bg-surface2 hover:text-ink"
              >
                <Icon name="close" size={20} />
              </button>
            )}
          </div>
          <div className="thin-scroll max-h-[calc(80vh-7rem)] overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-line/80 px-5 py-3">{footer}</div>}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 anim-fade"
        onClick={() => (dismissable ? onClose() : undefined)}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${widths[size]} max-h-[88vh] overflow-hidden rounded-t-2xl bg-surface/90 shadow-card anim-pop backdrop-blur-xl sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="text-base font-semibold text-ink">{title}</div>
          {dismissable && (
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="pressable rounded-full p-1.5 text-mut hover:bg-surface2 hover:text-ink"
            >
              <Icon name="close" size={20} />
            </button>
          )}
        </div>
        <div className="thin-scroll max-h-[calc(88vh-7rem)] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
