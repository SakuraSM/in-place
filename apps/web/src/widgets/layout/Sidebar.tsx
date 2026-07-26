import { Link, NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Shapes, Camera, User, StickyNote, MapPinned, Clock3, PanelLeftClose, PanelLeftOpen, Plus, QrCode, ClipboardCheck, Bell, Users, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  getDesktopPrimaryNavigationItems,
  type AppNavigationItemId,
  type AppNavigationSection,
} from '@inplace/app-core';
import BrandLockup from '../../shared/ui/BrandLockup';
import { buildHomeCreateRoute } from '../../features/inventory/lib/homeRoute';
import { APP_PAGE_HEADER_TOP_ZONE } from '../../shared/ui/pageHeader';
import BrandVersionFooter from '../../shared/ui/BrandVersionFooter';
import HouseholdSwitcher from './HouseholdSwitcher';
import {
  isNavigationPathActive,
  type NavigationMatchMode,
} from './navigationMatch';

const WEB_NAVIGATION_ADAPTER: Record<AppNavigationItemId, {
  to: string;
  icon: LucideIcon;
  matchMode?: NavigationMatchMode;
}> = {
  home: { to: '/', icon: Home },
  overview: { to: '/overview', icon: Search },
  locations: { to: '/locations', icon: MapPinned },
  activity: { to: '/activity', icon: Clock3 },
  categories: { to: '/categories', icon: Shapes },
  tags: { to: '/tags', icon: StickyNote },
  scan: { to: '/scan', icon: Camera, matchMode: 'exact' },
  profile: { to: '/profile', icon: User },
};

const navItems = getDesktopPrimaryNavigationItems().map((item) => ({
  ...item,
  ...WEB_NAVIGATION_ADAPTER[item.id],
}));

const NAVIGATION_SECTION_LABELS: Record<AppNavigationSection, string> = {
  inventory: '物品管理',
  operations: '效率工具',
  management: '整理设置',
  account: '账号',
};

const NAVIGATION_SECTION_ORDER: readonly AppNavigationSection[] = [
  'inventory',
  'operations',
  'management',
  'account',
];

const navigationSections = NAVIGATION_SECTION_ORDER
  .map((section) => ({
    section,
    items: navItems.filter((item) => item.section === section),
  }))
  .filter(({ items }) => items.length > 0);

const sidebarEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const createRoute = buildHomeCreateRoute(location.pathname, location.search);

  return (
    <aside
      aria-label="主导航"
      className={`fixed left-0 top-0 z-40 hidden h-dvh flex-col border-r border-borderSoft bg-surface transition-[width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex ${
        collapsed ? 'w-24' : 'w-64 xl:w-72'
      }`}
    >
      <div className={`border-b border-borderSoft transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? 'px-3' : 'px-5'}`}>
        <div className={`flex items-center ${APP_PAGE_HEADER_TOP_ZONE} ${collapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          {collapsed ? (
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/branding/inplace-logo-mark.png"
                alt="归位"
                className="h-12 w-12 object-contain object-center"
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
                aria-expanded="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surfaceMuted text-slate-600 transition-colors hover:bg-brandTint hover:text-brandStrong"
              >
                <PanelLeftClose size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? 'px-3 py-3' : 'px-5 py-3'}`}>
        <div className="mb-2">
          <HouseholdSwitcher compact={collapsed} />
        </div>
        {collapsed ? (
          <div className="space-y-2">
            <Link
              to={createRoute}
              title="立即新增"
              aria-label="立即新增"
              className="flex w-full items-center justify-center rounded-2xl bg-brandTint py-2.5 text-brandStrong transition-colors hover:bg-brand/20"
            >
              <Plus size={18} />
            </Link>
            <button
              type="button"
              onClick={onToggle}
              title="展开菜单"
              aria-label="展开菜单"
              aria-expanded="false"
              className="flex w-full items-center justify-center rounded-2xl bg-surfaceMuted py-2.5 text-slate-600 transition-colors hover:bg-brandTint hover:text-brandStrong"
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        ) : (
          <Link
            to={createRoute}
            title="立即新增"
            aria-label="立即新增"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brandStrong px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            <Plus size={18} />
            立即新增
          </Link>
        )}
      </div>

      <nav className={`relative flex-1 space-y-4 overflow-y-auto pb-5 pt-2 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? 'px-2' : 'px-3'}`}>
        {navigationSections.map(({ section, items: sectionItems }) => (
          <div key={section}>
            {!collapsed ? (
              <p className="mb-1 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {NAVIGATION_SECTION_LABELS[section]}
              </p>
            ) : null}
            <div className="space-y-1">
              {sectionItems.map(({ to, icon: Icon, label, matchMode }) => {
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
                    title={collapsed ? label : undefined}
                    className={`relative flex items-center overflow-hidden rounded-xl text-sm font-medium transition-[padding,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      collapsed ? 'justify-center px-0 py-3' : 'justify-start px-4 py-3'
                    }`}
                  >
                    {isActive ? (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute inset-0 rounded-xl bg-brandTint"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    ) : null}
                    <span
                      className={`relative flex min-w-0 items-center ${
                        isActive ? 'text-brandStrong' : 'text-slate-600 hover:text-slate-900'
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
            </div>
          </div>
        ))}
        <div>
          {!collapsed ? (
            <p className="mb-1 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">家庭管家</p>
          ) : null}
          <div className="space-y-1">
            {[
              { to: '/scan/codes', label: '扫码归位', icon: QrCode },
              { to: '/stocktakes', label: '家庭盘点', icon: ClipboardCheck },
              { to: '/reminders', label: '提醒中心', icon: Bell },
              { to: '/household', label: '家庭成员', icon: Users },
            ].map(({ to, label, icon: Icon }) => {
              const isActive = isNavigationPathActive({
                pathname: location.pathname,
                targetPath: to,
              });
              return (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center rounded-xl py-3 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} ${isActive ? 'bg-brandTint text-brandStrong' : 'text-slate-600 hover:bg-surfaceMuted hover:text-slate-900'}`}
                >
                  <Icon size={18} />
                  {!collapsed ? <span>{label}</span> : null}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      <div className={`border-t border-borderSoft transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? 'px-2 py-4' : 'px-5 py-5'}`}>
        <BrandVersionFooter compact={collapsed} className={collapsed ? 'flex-col gap-1.5' : 'justify-start'} />
      </div>
    </aside>
  );
}
