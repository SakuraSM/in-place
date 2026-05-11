import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Shapes, Camera, User, MapPinned, Clock3, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { getMobilePrimaryNavigationItems, type AppNavigationItemId } from '@inplace/app-core';

const WEB_MOBILE_NAVIGATION_ADAPTER: Record<AppNavigationItemId, { to: string; icon: LucideIcon }> = {
  home: { to: '/', icon: Home },
  overview: { to: '/overview', icon: Search },
  locations: { to: '/locations', icon: MapPinned },
  activity: { to: '/activity', icon: Clock3 },
  categories: { to: '/categories', icon: Shapes },
  tags: { to: '/tags', icon: Shapes },
  scan: { to: '/scan', icon: Camera },
  profile: { to: '/profile', icon: User },
};

const tabs = getMobilePrimaryNavigationItems().map((item) => ({
  ...item,
  ...WEB_MOBILE_NAVIGATION_ADAPTER[item.id],
}));

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-100 safe-bottom">
      <div className="flex items-center max-w-lg mx-auto px-1">
        {tabs.map(({ to, icon: Icon, shortLabel }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
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
                      className="absolute inset-0 bg-sky-100 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`relative transition-colors duration-150 ${isActive ? 'text-sky-600' : 'text-slate-400'}`}
                  />
                </div>
                <span className={`text-[10px] transition-colors duration-150 ${isActive ? 'font-semibold text-sky-600' : 'font-medium text-slate-400'}`}>
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
