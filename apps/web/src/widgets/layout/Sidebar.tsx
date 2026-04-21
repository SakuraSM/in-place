import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Shapes, Camera, User, StickyNote, MapPinned, Clock3, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandLockup from '../../shared/ui/BrandLockup';
import { HOME_CREATE_ROUTE } from '../../features/inventory/lib/homeRoute';
import { APP_PAGE_HEADER_TOP_ZONE } from '../../shared/ui/pageHeader';

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

const sidebarEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

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
      className={`hidden md:flex fixed left-0 top-0 z-40 h-screen flex-col border-r border-slate-100 bg-white transition-[width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        collapsed ? 'w-24' : 'w-64 lg:w-72'
      }`}
    >
      <div className={`border-b border-slate-100 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? 'px-3' : 'px-5'}`}>
        <div className={`flex items-center ${APP_PAGE_HEADER_TOP_ZONE} ${collapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          {collapsed ? (
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/branding/inplace-logo-mark.png"
                alt="归位"
                className="h-12 w-12 object-cover object-center"
              />
            </div>
          ) : (
            <>
              <BrandLockup
                size="sm"
                animated
                logoVariant="mark"
              />
              <button
                type="button"
                onClick={onToggle}
                title="折叠菜单"
                aria-label="折叠菜单"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <PanelLeftClose size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? 'px-3 py-3' : 'px-5 py-3'}`}>
        {collapsed ? (
          <div className="space-y-2">
            <NavLink
              to={HOME_CREATE_ROUTE}
              title="立即新增"
              aria-label="立即新增"
              className="flex w-full items-center justify-center rounded-2xl bg-sky-50 py-2.5 text-sky-600 transition-colors hover:bg-sky-100 hover:text-sky-700"
            >
              <Plus size={18} />
            </NavLink>
            <button
              type="button"
              onClick={onToggle}
              title="展开菜单"
              aria-label="展开菜单"
              className="flex w-full items-center justify-center rounded-2xl bg-slate-100 py-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        ) : (
          <NavLink
            to={HOME_CREATE_ROUTE}
            title="立即新增"
            aria-label="立即新增"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-600 transition-colors hover:bg-sky-100 hover:text-sky-700"
          >
            <Plus size={18} />
            立即新增
          </NavLink>
        )}
      </div>

      <nav className={`relative flex-1 space-y-1 pb-5 pt-2 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? 'px-2' : 'px-3'}`}>
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
              className={`relative flex items-center overflow-hidden rounded-xl text-sm font-medium transition-[padding,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                collapsed
                  ? 'justify-center px-0 py-3'
                  : 'justify-start px-4 py-3'
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
                  isActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <motion.span
                  animate={{ x: collapsed ? 0 : 2 }}
                  transition={{ duration: 0.28, ease: sidebarEase }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </motion.span>
                <motion.span
                  aria-hidden={collapsed}
                  initial={false}
                  animate={{
                    opacity: collapsed ? 0 : 1,
                    maxWidth: collapsed ? 0 : 160,
                    marginLeft: collapsed ? 0 : 12,
                    x: collapsed ? -8 : 0,
                  }}
                  transition={{
                    opacity: { duration: collapsed ? 0.12 : 0.18, delay: collapsed ? 0 : 0.12, ease: sidebarEase },
                    maxWidth: { duration: 0.3, delay: collapsed ? 0 : 0.08, ease: sidebarEase },
                    marginLeft: { duration: 0.3, delay: collapsed ? 0 : 0.08, ease: sidebarEase },
                    x: { duration: 0.24, delay: collapsed ? 0 : 0.1, ease: sidebarEase },
                  }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {label}
                </motion.span>
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className={`border-t border-slate-100 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? 'px-2 py-4' : 'px-5 py-5'}`}>
        <p className={`text-center text-xs text-slate-300 ${collapsed ? 'leading-5' : ''}`}>
          {collapsed ? 'v0.1.0' : '归位 v0.1.0'}
        </p>
      </div>
    </aside>
  );
}
