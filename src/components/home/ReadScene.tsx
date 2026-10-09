export type ReadSceneType = 'clouds' | 'quran' | 'arch' | 'night' | 'mosque';

import { useId } from 'react';

export function ReadScene({ scene }: { scene: ReadSceneType }) {
  const id = useId().replace(/:/g, '');
  const skyId = `scene-sky-${id}`;
  const glowId = `scene-glow-${id}`;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 480 220"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={scene === 'night' || scene === 'arch' ? '#071b28' : '#367b78'} />
          <stop offset="1" stopColor={scene === 'clouds' ? '#c2a77b' : '#173c38'} />
        </linearGradient>
        <linearGradient id={glowId} x1="0" y1="0" x2="0.8" y2="1">
          <stop stopColor="#ead8a5" stopOpacity=".8" />
          <stop offset="1" stopColor="#ead8a5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="480" height="220" fill={`url(#${skyId})`} />
      {(scene === 'clouds' || scene === 'mosque') && (
        <>
          <circle cx="370" cy="58" r="37" fill={`url(#${glowId})`} />
          <path d="M0 127c34-18 57 8 90-1 35-10 50-31 92-15 24 9 40 7 63 1 25-6 43 4 63 17v91H0z" fill="#e5d5be" fillOpacity=".19" />
          <path d="M0 157c46-21 71 3 109-11 40-15 60-18 99 3 28 15 48-3 78-8 39-7 58 18 91 10 41-10 67-6 103 9v60H0z" fill="#f1e4cf" fillOpacity=".17" />
        </>
      )}
      {(scene === 'night' || scene === 'arch') && (
        <>
          <circle cx="365" cy="55" r="22" fill="#f1dfae" fillOpacity=".85" />
          <circle cx="374" cy="47" r="22" fill="#0a202b" />
          <g fill="#f7eac7" fillOpacity=".8">
            <circle cx="66" cy="42" r="1.7" /><circle cx="118" cy="73" r="1.3" />
            <circle cx="208" cy="39" r="1.4" /><circle cx="278" cy="65" r="1.8" />
            <circle cx="432" cy="103" r="1.4" /><circle cx="153" cy="111" r="1.2" />
          </g>
        </>
      )}
      {(scene === 'night' || scene === 'clouds') && (
        <>
          <path d="M0 168 103 103l91 72 90-68 107 71 89-57v99H0z" fill="#102c2d" fillOpacity=".88" />
          <path d="m0 190 110-48 97 44 109-48 91 50 73-25v57H0z" fill="#071d20" fillOpacity=".88" />
        </>
      )}
      {scene === 'arch' && (
        <>
          <path d="M110 220V100a130 130 0 0 1 260 0v120h-32V101a98 98 0 0 0-196 0v119z" fill="#d2b780" fillOpacity=".35" />
          <path d="M164 220v-87a76 76 0 0 1 152 0v87h-24v-86a52 52 0 0 0-104 0v86z" fill="#f1dfae" fillOpacity=".18" />
        </>
      )}
      {scene === 'mosque' && (
        <>
          <path d="M0 179h480v41H0z" fill="#081e1c" fillOpacity=".78" />
          <path d="m108 151 55-36 55 36v42H108zm154 0 55-36 55 36v42H262z" fill="#e6d3aa" fillOpacity=".35" />
          <path d="M154 114a9 9 0 0 1 18 0v14h-18zm154 0a9 9 0 0 1 18 0v14h-18z" fill="#ead7ad" fillOpacity=".55" />
          <path d="M71 195v-95h10v95m317 0v-95h10v95M66 100h20m307 0h20" stroke="#ead7ad" strokeOpacity=".55" strokeWidth="3" />
        </>
      )}
      {scene === 'quran' && (
        <>
          <circle cx="364" cy="54" r="48" fill={`url(#${glowId})`} />
          <path d="M145 156c47-32 91-27 95-15 4-12 48-17 95 15v39c-48-28-84-24-95-12-11-12-47-16-95 12z" fill="#eee1c2" fillOpacity=".88" />
          <path d="M240 141v42m-87-17c28-12 56-13 78-4m56 4c-28-12-56-13-78-4" stroke="#836b48" strokeOpacity=".75" strokeWidth="2" />
          <path d="m163 196 77-13 77 13-14 14h-126z" fill="#8c633e" />
          <path d="m180 207 60-10 60 10-10 9H190z" fill="#61432f" />
        </>
      )}
      <rect width="480" height="220" fill={`url(#${glowId})`} fillOpacity={scene === 'clouds' ? '.12' : '0'} />
    </svg>
  );
}
