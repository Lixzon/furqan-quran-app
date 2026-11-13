import { APP_TAGLINE } from '../../lib/constants';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { appSectionForPath, isSectionNavItemActive, navItemsForSection } from '../../shared/sectionNavigation';
import { SwitchAppsButton } from '../../shared/SectionSwitcher';

export function Sidebar() {
  const { pathname } = useLocation();
  const section = appSectionForPath(pathname);
  const items = navItemsForSection(section);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <SwitchAppsButton className="hidden md:inline-flex" />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={() => {
              const isActive = isSectionNavItemActive(pathname, it);
              return (
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent/12 text-accent' : 'text-mut hover:bg-surface2 hover:text-ink'
              }`
              );
            }}
          >
            <Icon name={it.icon} size={19} />
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-[11px] leading-relaxed text-mut">
        <div style={{ direction: 'rtl', textAlign: 'center' }} className="text-sm">
          بسم الله الرحمن الرحيم
        </div>
        <div className="mt-1 text-center">{APP_TAGLINE}</div>
      </div>
    </aside>
  );
}
