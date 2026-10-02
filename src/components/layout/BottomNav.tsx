import { NavLink } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { Icon, type IconName } from '../ui/Icon';

interface BottomNavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const items: BottomNavItem[] = [
  { to: '/', label: 'Read', icon: 'book', end: true },
  { to: '/library', label: 'Library', icon: 'list' },
  { to: '/favorites', label: 'Favorites', icon: 'heart' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

export function BottomNav() {
  const readingMode = useAppSelector((s) => s.settings.readingMode);
  if (readingMode) return null;

  return (
    <nav className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl md:hidden" style={{ paddingTop: 4 }}>
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-mut'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`rounded-full p-1.5 ${isActive ? 'bg-accent/12' : 'bg-transparent'}`}>
                  <Icon name={item.icon} size={18} />
                </div>
                <span>{item.label}</span>
                <span className={`h-1 w-1 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
