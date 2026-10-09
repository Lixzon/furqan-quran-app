import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/* ---------- Toggle switch ---------- */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative box-border inline-flex h-6 w-10 min-w-10 max-w-10 flex-none items-center overflow-hidden rounded-full border p-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        checked ? 'border-accent bg-accent' : 'border-line2 bg-surface2'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
    >
      <span
        className={`pointer-events-none absolute left-[3px] top-1/2 size-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ---------- Segmented control ---------- */
export interface SegOption<T extends string> {
  label: ReactNode;
  value: T;
  icon?: IconName;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = '',
  size = 'md',
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  return (
    <div className={`inline-flex flex-wrap items-center gap-1 rounded-full bg-surface2 p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-150 ${pad} ${
              active ? 'bg-accent text-onaccent shadow' : 'text-mut hover:text-ink'
            }`}
          >
            {o.icon ? <Icon name={o.icon} size={size === 'sm' ? 14 : 16} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Slider ---------- */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      type="range"
      aria-label={ariaLabel}
      className={`w-full cursor-pointer appearance-none rounded-full ${className}`}
      style={{ accentColor: 'var(--q-accent)' }}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

/* ---------- Icon button ---------- */
export function IconButton({
  icon,
  onClick,
  label,
  active = false,
  disabled,
  size = 22,
  className = '',
}: {
  icon: IconName;
  onClick?: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`pressable inline-flex items-center justify-center rounded-full p-2 transition-colors ${
        active ? 'bg-accent/15 text-accent' : 'text-mut hover:bg-surface2 hover:text-ink'
      } disabled:opacity-40 ${className}`}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

/* ---------- Small label chip ---------- */
export function Chip({
  children,
  tone = 'default',
  className = '',
  onClick,
}: {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'gold';
  className?: string;
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    default: 'bg-surface2 text-mut',
    accent: 'bg-accent/12 text-accent',
    gold: 'bg-gold/12 text-gold',
  };
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
