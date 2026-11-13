import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { appSectionForPath, isSectionNavItemActive, navItemsForSection } from '../../shared/sectionNavigation';

export function BottomNav() {
  const { pathname } = useLocation();
  const items = navItemsForSection(appSectionForPath(pathname));

  return (
    <nav aria-label={`${appSectionForPath(pathname) === 'mishka' ? 'Mishka' : 'Furqan'} navigation`} className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl md:hidden" style={{ paddingTop: 4 }}>
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {items.map((item) => {
          const isActive = isSectionNavItemActive(pathname, item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-mut'
              }`}
            >
              <>
                <div className={`rounded-full p-1.5 ${isActive ? 'bg-accent/12' : 'bg-transparent'}`}>
                  <Icon name={item.icon} size={18} />
                </div>
                <span>{item.label}</span>
                <span className={`h-1 w-1 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
              </>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
