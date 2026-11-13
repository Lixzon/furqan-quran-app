import type { IconName } from '../components/ui/Icon';

export type AppSection = 'mishka' | 'furqan';

export interface SectionNavItem {
  to: string;
  icon: IconName;
  label: string;
  end?: boolean;
}

const MISHKA_ITEMS: SectionNavItem[] = [
  { to: '/journey', icon: 'home', label: 'Home', end: true },
  { to: '/mishka/library', icon: 'list', label: 'Library', end: true },
  { to: '/mishka/community', icon: 'users', label: 'Community Hub', end: true },
  { to: '/mishka/guidance', icon: 'sparkle', label: 'Guidance', end: true },
  { to: '/mishka/profile', icon: 'user', label: 'Profile', end: true },
];

const FURQAN_ITEMS: SectionNavItem[] = [
  { to: '/quran', icon: 'book', label: 'Read', end: true },
  { to: '/library', icon: 'list', label: 'Library', end: true },
  { to: '/guidance', icon: 'sparkle', label: 'Guidance', end: true },
  { to: '/progress', icon: 'progress', label: 'Progress', end: true },
  { to: '/profile', icon: 'user', label: 'Profile', end: true },
];

export function appSectionForPath(pathname: string): AppSection {
  return pathname === '/' ||
    pathname === '/journey' ||
    pathname.startsWith('/mishka/') ||
    pathname === '/stories' ||
    pathname === '/quotes' ||
    pathname === '/mishkah'
    ? 'mishka'
    : 'furqan';
}

export function navItemsForSection(section: AppSection): SectionNavItem[] {
  return section === 'mishka' ? MISHKA_ITEMS : FURQAN_ITEMS;
}

export function isSectionNavItemActive(pathname: string, item: SectionNavItem): boolean {
  if (item.to === '/journey') return pathname === '/' || pathname === '/journey';
  if (item.to === '/quran') return pathname === '/quran' || pathname.startsWith('/surah/');
  if (item.to === '/mishka/library') {
    return pathname === item.to ||
      pathname.startsWith('/mishka/archives') ||
      pathname.startsWith('/mishka/favorites') ||
      pathname === '/stories' ||
      pathname === '/quotes';
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
