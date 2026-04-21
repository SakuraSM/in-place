import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Shapes, Camera, User, StickyNote, MapPinned, Clock3, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandLockup from '../../shared/ui/BrandLockup';

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/overview', icon: Search, label: '总览' },
  { to: '/locations', icon: MapPinned, label: '位置树' },
  { to: '/activity', icon: Clock3, label: '操作记录' },
  { to: '/categories', icon: Shapes, label: '分类管理' },
  { to: '/tags', icon: StickyNote, label: '标签管理' },
  { to: '/scan', icon: Camera, label: 'AI 扫描' },
  { to: '/profile', icon: User, label: '我的' },
];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();

  return (
    <aside
      className={`hidden md:flex fixed left-0 top-0 z-40 h-screen flex-col border-r border-slate-100 bg-white transition-[width] duration-300 ${
        collapsed ? 'w-24' : 'w-64 lg:w-72'
      }`}
    >
      <div className={`border-b border-slate-100 ${collapsed ? 'px-3 py-5' : 'px-6 py-6'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          {collapsed ? (
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/branding/inplace-logo-mark.png"
                alt="归位"
                className="h-12 w-12 object-cover object-center"
              />
            </div>
          ) : (
            <BrandLockup
              size="sm"
              animated
              logoVariant="mark"
            />
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={onToggle}
              title="折叠菜单"
              aria-label="折叠菜单"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            title="展开菜单"
            aria-label="展开菜单"
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-slate-100 py-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
      </div>

      <nav className={`relative flex-1 space-y-1 py-5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={`relative flex overflow-hidden rounded-xl text-sm font-medium transition-colors duration-150 ${
                collapsed
                  ? 'justify-center px-0 py-3'
                  : 'items-center gap-3 px-4 py-3'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute inset-0 bg-sky-50 rounded-xl"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span
                className={`relative flex min-w-0 items-center ${
                  collapsed ? 'justify-center' : 'gap-3'
                } ${isActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span
                  aria-hidden={collapsed}
                  className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ${
                    collapsed
                      ? 'ml-0 max-w-0 opacity-0'
                      : 'ml-0 max-w-32 opacity-100 delay-150'
                  }`}
                >
                  {label}
                </span>
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className={`border-t border-slate-100 ${collapsed ? 'px-2 py-4' : 'px-5 py-5'}`}>
        <p className={`text-center text-xs text-slate-300 ${collapsed ? 'leading-5' : ''}`}>
          {collapsed ? 'v0.1.0' : '归位 v0.1.0'}
        </p>
      </div>
    </aside>
  );
}
