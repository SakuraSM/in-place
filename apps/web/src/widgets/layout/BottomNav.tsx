import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Shapes, Camera, User, MapPinned, Clock3, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { getMobilePrimaryNavigationItems, type AppNavigationItemId } from '@inplace/app-core';
import {
  isNavigationPathActive,
  type NavigationMatchMode,
} from './navigationMatch';

const WEB_MOBILE_NAVIGATION_ADAPTER: Record<AppNavigationItemId, {
  to: string;
  icon: LucideIcon;
  matchMode?: NavigationMatchMode;
}> = {
  home: { to: '/', icon: Home },
  overview: { to: '/overview', icon: Search },
  locations: { to: '/locations', icon: MapPinned },
  activity: { to: '/activity', icon: Clock3 },
  manage: { to: '/manage', icon: Shapes },
  categories: { to: '/categories', icon: Shapes },
  tags: { to: '/tags', icon: Shapes },
  scan: { to: '/scan', icon: Camera, matchMode: 'exact' },
  profile: { to: '/profile', icon: User },
};

const tabs = getMobilePrimaryNavigationItems().map((item) => ({
  ...item,
  ...WEB_MOBILE_NAVIGATION_ADAPTER[item.id],
}));

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav aria-label="移动端主导航" className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-center px-1">
        {tabs.map(({ to, icon: Icon, shortLabel, matchMode }) => {
          const isActive = isNavigationPathActive({
            pathname: location.pathname,
            targetPath: to,
            mode: matchMode,
          });
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || matchMode === 'exact'}
              aria-current={isActive ? 'page' : undefined}
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2"
            >
              <motion.div
                whileTap={{ scale: 0.85, rotate: isActive ? 0 : -5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="relative flex flex-col items-center gap-0.5"
              >
                <div className="relative w-10 h-7 flex items-center justify-center">
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-pill"
                      className="absolute inset-0 rounded-full bg-brandTint"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`relative transition-colors duration-150 ${isActive ? 'text-brandStrong' : 'text-slate-500'}`}
                  />
                </div>
                <span className={`text-[11px] transition-colors duration-150 ${isActive ? 'font-bold text-brandStrong' : 'font-medium text-slate-600'}`}>
                  {shortLabel}
                </span>
              </motion.div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
