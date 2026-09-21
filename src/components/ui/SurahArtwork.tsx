import { useId, type CSSProperties } from 'react';

function seededValue(seed: number, offset: number): number {
  const value = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** Deterministic geometric artwork that adapts to the active theme tokens. */
export function SurahArtwork({ surah, className = '' }: { surah: number; className?: string }) {
  const instanceId = useId().replace(/:/g, '');
  const rotation = Math.round(seededValue(surah, 1) * 45);
  const scale = 0.72 + seededValue(surah, 2) * 0.34;
  const accentOpacity = 0.22 + seededValue(surah, 3) * 0.2;
  const goldOpacity = 0.2 + seededValue(surah, 4) * 0.22;
  const patternId = `surah-pattern-${surah}-${instanceId}`;
  const style = { '--art-rotation': `${rotation}deg`, '--art-scale': scale } as CSSProperties;

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 240 160"
      preserveAspectRatio="xMidYMid slice"
      style={style}
    >
      <defs>
        <linearGradient id={`${patternId}-wash`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--q-accent)" stopOpacity="0.3" />
          <stop offset="1" stopColor="var(--q-accent-strong)" stopOpacity="0.08" />
        </linearGradient>
        <pattern id={patternId} width="48" height="48" patternUnits="userSpaceOnUse" patternTransform={`rotate(${rotation} 24 24) scale(${scale})`}>
          <path d="M24 0 31 17 48 24 31 31 24 48 17 31 0 24 17 17Z" fill="none" stroke="var(--q-accent)" strokeOpacity={accentOpacity} strokeWidth="1.2" />
          <path d="M24 9 39 24 24 39 9 24Z" fill="none" stroke="var(--q-gold)" strokeOpacity={goldOpacity} strokeWidth="1" />
          <circle cx="24" cy="24" r="3" fill="var(--q-gold)" fillOpacity={goldOpacity} />
          <path d="M0 0 12 12M36 12 48 0M0 48 12 36M36 36 48 48" fill="none" stroke="var(--q-accent-strong)" strokeOpacity="0.18" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="240" height="160" fill={`url(#${patternId}-wash)`} />
      <rect width="240" height="160" fill={`url(#${patternId})`} />
    </svg>
  );
}
