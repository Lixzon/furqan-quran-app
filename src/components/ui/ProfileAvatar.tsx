import type { ProfileAvatarId } from '../../types';

export const PROFILE_AVATARS: Array<{ id: ProfileAvatarId; label: string }> = [
  { id: 'crescent', label: 'Crescent moon' },
  { id: 'sunrise', label: 'Morning sun' },
  { id: 'ocean', label: 'Ocean waves' },
  { id: 'mountain', label: 'Mountain' },
  { id: 'qarawiyyin', label: 'Al-Qarawiyyin' },
  { id: 'arch', label: 'Geometric arch' },
  { id: 'dome', label: 'Mosque dome' },
  { id: 'quran', label: 'Quran on rehal' },
  { id: 'kaaba', label: 'The Kaaba · Makkah' },
  { id: 'nabawi', label: 'Green Dome · Madinah' },
  { id: 'domeRock', label: 'Dome of the Rock' },
  { id: 'alAqsa', label: 'Al-Aqsa Mosque' },
  { id: 'madinah', label: 'Madinah skyline' },
  { id: 'minaret', label: 'Mosque minaret' },
  { id: 'desert', label: 'Arabian desert' },
  { id: 'palm', label: 'Palm silhouette' },
  { id: 'stars', label: 'Starry night' },
  { id: 'galaxy', label: 'Galaxy' },
  { id: 'geometric', label: 'Islamic geometry' },
  { id: 'lantern', label: 'Ramadan lantern' },
];

export function ProfileAvatar({ id, size = 38 }: { id: ProfileAvatarId; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', fill: 'none', 'aria-hidden': true as const };
  const color = 'currentColor';
  return (
    <svg {...common} className="shrink-0 text-accent">
      {id === 'crescent' && <><circle cx="24" cy="24" r="15" fill="currentColor" opacity=".2" /><path d="M30 8a16 16 0 1 0 10 27A14 14 0 0 1 30 8Z" fill="currentColor" /><path d="m36 12 1.3 3.1 3.2 1.2-3.2 1.2L36 21l-1.2-3.5-3.1-1.2 3.1-1.2L36 12Z" fill={color} /> </>}
      {id === 'sunrise' && <><circle cx="24" cy="22" r="10" fill="currentColor" opacity=".75" /><path d="M7 34h34M12 29a12 12 0 0 1 24 0M24 5v4M9 13l3 3m24-3-3 3" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></>}
      {id === 'ocean' && <><path d="M5 18c5-5 9 5 14 0s9 5 14 0 7 1 10 0M5 27c5-5 9 5 14 0s9 5 14 0 7 1 10 0M5 36c5-5 9 5 14 0s9 5 14 0 7 1 10 0" stroke={color} strokeWidth="3" strokeLinecap="round" /></>}
      {id === 'mountain' && <><circle cx="34" cy="13" r="5" fill="currentColor" opacity=".7" /><path d="m4 38 14-21 9 12 5-7 12 16H4Z" fill="currentColor" opacity=".8" /><path d="m14 23 4-6 5 7" stroke="white" strokeOpacity=".8" strokeWidth="1.5" /></>}
      {id === 'qarawiyyin' && <><path d="M7 40V22h6V12h5v10h4V9h6v13h4V14h5v8h4v18H7Z" fill="currentColor" opacity=".82" /><path d="M4 41h40M20 40V29a4 4 0 0 1 8 0v11" stroke={color} strokeWidth="2" /></>}
      {id === 'arch' && <><path d="M7 41V22a17 17 0 0 1 34 0v19M13 41V23a11 11 0 0 1 22 0v18M19 41V24a5 5 0 0 1 10 0v17" stroke={color} strokeWidth="2.5" /><path d="M4 41h40" stroke={color} strokeWidth="2.5" /></>}
      {id === 'dome' && <><path d="M8 40V27h32v13M14 27a10 10 0 0 1 20 0M22 17a2 2 0 1 1 4 0v-5h-4v5ZM4 41h40" stroke={color} strokeWidth="2.5" strokeLinejoin="round" /><path d="M20 40v-7h8v7" stroke={color} strokeWidth="2" /></>}
      {id === 'quran' && <><path d="m7 13 16 3v24L7 37V13Zm34 0-16 3v24l16-3V13Z" fill="currentColor" opacity=".2" stroke={color} strokeWidth="2" strokeLinejoin="round" /><path d="M11 19h8m-8 4h8m10-4h8m-8 4h8M5 42h38M13 37l11 4 11-4" stroke={color} strokeWidth="2" strokeLinecap="round" /></>}
      {id === 'kaaba' && <><path d="m8 17 16-8 16 8v22l-16 8-16-8V17Z" fill="currentColor" opacity=".82" /><path d="m8 17 16 8 16-8M24 25v22M8 23l16 8 16-8" stroke="#f5d87b" strokeWidth="2.4" /><path d="m8 17 16 8 16-8" stroke="white" strokeOpacity=".7" strokeWidth="1.5" /></>}
      {id === 'nabawi' && <><path d="M7 40V27h34v13M14 27a10 10 0 0 1 20 0M19 27a5 5 0 0 1 10 0" fill="currentColor" opacity=".18" stroke={color} strokeWidth="2" /><path d="M19 27a5 5 0 0 1 10 0V17l-5-5-5 5v10ZM4 41h40" fill="currentColor" stroke={color} strokeWidth="2" /><path d="M24 12V7m-2 3h4" stroke={color} strokeWidth="2" /></>}
      {id === 'domeRock' && <><path d="M5 40h38M8 40V27h32v13M15 27a9 9 0 0 1 18 0" stroke={color} strokeWidth="2.3" /><path d="M15 27a9 9 0 0 1 18 0v-4a9 9 0 0 0-18 0v4Z" fill="#e9bd54" /><path d="M21 18a3 3 0 0 1 6 0v-3h-6v3Z" fill="#e9bd54" stroke={color} strokeWidth="1.5" /><path d="M12 31h24" stroke="#e9bd54" strokeWidth="2" /></>}
      {id === 'alAqsa' && <><path d="M5 40h38M8 40V26h32v14M13 26a11 11 0 0 1 22 0" stroke={color} strokeWidth="2.3" /><path d="M17 26a7 7 0 0 1 14 0v-5l-7-5-7 5v5Z" fill="currentColor" opacity=".65" /><path d="M20 40v-7h8v7M7 24h34" stroke={color} strokeWidth="2" /></>}
      {id === 'madinah' && <><circle cx="35" cy="12" r="5" fill="currentColor" opacity=".35" /><path d="M4 40h40M7 40V27h9v13M17 40V24h6v16M24 40V28h8v12M34 40V22h7v18" fill="currentColor" opacity=".55" stroke={color} strokeWidth="1.8" /><path d="M17 24a3 3 0 0 1 6 0m11-2a3.5 3.5 0 0 1 7 0m-16 6h8" stroke={color} strokeWidth="1.8" /></>}
      {id === 'minaret' && <><path d="M18 43V16h12v27M15 16h18l-3-5H18l-3 5ZM20 10V7h8v3M14 23h20M16 29h16M4 43h40" fill="currentColor" opacity=".25" stroke={color} strokeWidth="2.3" /><path d="M22 43V34a2 2 0 0 1 4 0v9M24 4v3" stroke={color} strokeWidth="2" /></>}
      {id === 'desert' && <><circle cx="34" cy="13" r="6" fill="currentColor" opacity=".55" /><path d="M3 36c8-10 14-10 22 0 7-9 13-10 20-3v10H3V36Z" fill="currentColor" opacity=".72" /><path d="M3 41c10-6 16-5 23 2 6-6 11-7 19-4" stroke="white" strokeOpacity=".7" strokeWidth="1.5" /></>}
      {id === 'palm' && <><path d="M24 42V17m0 7C15 19 11 20 7 17c5 0 8-2 10-6 2 4 4 6 7 7m0 4c8-7 12-7 17-5-5 1-7 4-9 8-3-2-5-3-8-3m0-4C19 11 20 7 24 4c1 5 3 7 7 9-3 2-5 3-7 4Zm-4 25h8" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 43h40" stroke={color} strokeWidth="2" /></>}
      {id === 'stars' && <><path d="M7 37c9-8 20-8 34 0" stroke={color} strokeWidth="2" /><path d="m13 12 1.5 3.5L18 17l-3.5 1.5L13 22l-1.5-3.5L8 17l3.5-1.5L13 12Zm19-5 1.2 2.8L36 11l-2.8 1.2L32 15l-1.2-2.8L28 11l2.8-1.2L32 7Zm5 14 .9 2.1L40 26l-2.1.9L37 29l-.9-2.1L34 26l2.1-.9L37 21Z" fill="currentColor" /></>}
      {id === 'galaxy' && <><ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(-32 24 24)" stroke={color} strokeWidth="2" opacity=".7" /><ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(32 24 24)" stroke={color} strokeWidth="2" opacity=".45" /><circle cx="24" cy="24" r="5" fill="currentColor" /><circle cx="10" cy="11" r="1.5" fill="currentColor" /><circle cx="39" cy="36" r="1.5" fill="currentColor" /></>}
      {id === 'geometric' && <><path d="m24 4 6 8 10-1-1 10 7 7-9 5-2 10-11-4-11 4-2-10-9-5 7-7-1-10 10 1 6-8Z" stroke={color} strokeWidth="2.2" /><path d="m24 13 4 7 8 4-8 4-4 7-4-7-8-4 8-4 4-7Zm0-9v9m0 16v15M7 27l9-3m16 0 9 3" stroke={color} strokeWidth="1.7" /></>}
      {id === 'lantern' && <><path d="M20 8h8m-7 0v5l-5 5 3 3-3 17h16l-3-17 3-3-5-5V8M16 21h16M18 31h12M24 4v4" stroke={color} strokeWidth="2.3" strokeLinejoin="round" /><path d="M21 24h6l2 6h-10l2-6Z" fill="currentColor" opacity=".55" /><path d="M20 43h8" stroke={color} strokeWidth="2" /></>}
    </svg>
  );
}
