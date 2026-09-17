import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function PageHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-mut">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function EmptyState({
  icon = 'info',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface2 text-mut">
        <Icon name={icon} size={28} />
      </div>
      <div className="text-base font-semibold text-ink">{title}</div>
      {message && <div className="mt-1 max-w-sm text-sm text-mut">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="shimmer flex items-center gap-3 rounded-2xl bg-surface p-3">
          <div className="h-11 w-11 rounded-xl bg-surface2" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-surface2" />
            <div className="h-3 w-1/3 rounded bg-surface2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-10 text-center">
      <Icon name="warning" size={28} className="text-danger" />
      <div className="mt-3 text-sm text-ink">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent"
        >
          Retry
        </button>
      )}
    </div>
  );
}
