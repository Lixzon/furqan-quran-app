import { useId } from 'react';

/**
 * "The Mihrab of Guidance" brand mark.
 *
 * A geometric mihrab (prayer arch) in matte gold on warm cream, with an open
 * Qur'an in deep sapphire at its base and a golden Nur (light) ascending from
 * the book through the apex of the arch.
 *
 * Keep the geometry here in sync with `public/logo.svg`, `public/favicon.svg`
 * and the rasteriser in `scripts/generate-icons.mjs`.
 */
export function MihrabLogo({
  size = 40,
  tile = true,
  className = '',
}: {
  size?: number;
  /** Draw the warm cream rounded tile behind the mark (used for app icons). */
  tile?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const beamId = `mihrab-beam-${uid}`;
  const glowId = `mihrab-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Furqan — Mihrab of Guidance"
    >
      <defs>
        <linearGradient id={beamId} x1="0" y1="374" x2="0" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e3c15a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e3c15a" stopOpacity="0" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      {tile && <rect width="512" height="512" rx="112" fill="#f7f1e3" />}

      {/* Nur: soft glow, then the tapered shaft dissolving upward */}
      <path d="M230 374 L282 374 L272 138 L240 138 Z" fill="#e3c15a" opacity="0.16" filter={`url(#${glowId})`} />
      <path d="M244 374 L268 374 L266 138 L246 138 Z" fill={`url(#${beamId})`} />

      {/* Mihrab arch: outer line and a finer inner line */}
      <path
        d="M150 428 V250 C150 180 200 140 256 116 C312 140 362 180 362 250 V428"
        fill="none"
        stroke="#c9a227"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M186 428 V258 C186 206 216 176 256 158 C296 176 326 206 326 258 V428"
        fill="none"
        stroke="#c9a227"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Floor of the mihrab */}
      <path d="M132 430 H380" stroke="#c9a227" strokeWidth="12" strokeLinecap="round" />

      {/* Open Qur'an resting on the floor */}
      <path
        d="M256 372 C232 356 202 350 168 354 L168 402 C202 398 232 404 256 420 C280 404 310 398 344 402 L344 354 C310 350 280 356 256 372 Z"
        fill="#1e3a8a"
      />
      <path d="M256 374 V418" stroke="#f7f1e3" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
