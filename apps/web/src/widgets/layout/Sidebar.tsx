import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Shapes, Camera, User, StickyNote } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandLockup from '../../shared/ui/BrandLockup';

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/overview', icon: Search, label: '总览' },
  { to: '/categories', icon: Shapes, label: '分类管理' },
  { to: '/tags', icon: StickyNote, label: '标签管理' },
  { to: '/scan', icon: Camera, label: 'AI 扫描' },
  { to: '/profile', icon: User, label: '我的' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 lg:w-72 flex-col bg-white border-r border-slate-100 z-40">
      <div className="px-6 py-6 border-b border-slate-100">
        <BrandLockup size="sm" animated logoVariant="mark" />
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 relative">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute inset-0 bg-sky-50 rounded-xl"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className={`relative flex items-center gap-3 ${isActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-5 py-5 border-t border-slate-100">
        <p className="text-xs text-slate-300 text-center">归位 v0.1.0</p>
      </div>
    </aside>
  );
}
