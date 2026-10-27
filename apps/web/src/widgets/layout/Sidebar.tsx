import { Link, NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Shapes, Camera, User, Tags, MapPinned, Clock3, PanelLeftClose, PanelLeftOpen, Plus, QrCode, ClipboardCheck, Bell, Users, Briefcase, type LucideIcon } from 'lucide-react';
import { getDesktopPrimaryNavigationItems, type AppNavigationItemId, type AppNavigationSection } from '@inplace/app-core';
import { useInventoryPermissions } from '../../shared/hooks/useInventoryPermissions';
import BrandVersionFooter from '../../shared/ui/BrandVersionFooter';
import { buildHomeCreateRoute } from '../../features/inventory/lib/homeRoute';
import HouseholdSwitcher from './HouseholdSwitcher';
import { isNavigationPathActive, type NavigationMatchMode } from './navigationMatch';

interface NavigationEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  matchMode?: NavigationMatchMode;
}

const WEB_NAVIGATION_ADAPTER: Record<AppNavigationItemId, Omit<NavigationEntry, 'label'>> = {
  home: { to: '/', icon: Home },
  overview: { to: '/overview', icon: Search },
  locations: { to: '/locations', icon: MapPinned },
  activity: { to: '/activity', icon: Clock3 },
  manage: { to: '/manage', icon: Briefcase },
  categories: { to: '/categories', icon: Shapes },
  tags: { to: '/tags', icon: Tags },
  scan: { to: '/scan', icon: Camera, matchMode: 'exact' },
  profile: { to: '/profile', icon: User },
};
const NAVIGATION_SECTIONS: readonly { id: AppNavigationSection; label: string }[] = [
  { id: 'inventory', label: '物品与空间' },
  { id: 'operations', label: '家庭日常' },
  { id: 'management', label: '整理与设置' },
  { id: 'account', label: '我的账户' },
];
const NAV_ITEMS = getDesktopPrimaryNavigationItems().map(item => ({ ...item, ...WEB_NAVIGATION_ADAPTER[item.id] }));
const TOOLS: NavigationEntry[] = [
  { to: '/scan/codes', label: '扫标签归位', icon: QrCode },
  { to: '/stocktakes', label: '家庭盘点', icon: ClipboardCheck },
  { to: '/reminders', label: '提醒中心', icon: Bell },
  { to: '/household', label: '家庭成员', icon: Users },
  { to: '/manage', label: '管理中心', icon: Briefcase },
];

interface SidebarProps { collapsed: boolean; onToggle: () => void }
interface SidebarLinkProps { entry: NavigationEntry; collapsed: boolean; pathname: string }

function SidebarLink({ entry, collapsed, pathname }: SidebarLinkProps) {
  const Icon = entry.icon;
  const isActive = isNavigationPathActive({ pathname, targetPath: entry.to, mode: entry.matchMode });
  return (
    <NavLink
      to={entry.to}
      end={entry.to === '/' || entry.matchMode === 'exact'}
      title={entry.label}
      aria-current={isActive ? 'page' : undefined}
      className={`sidebar-link flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] transition-colors ${isActive ? 'bg-brandTint font-semibold text-brandStrong' : 'text-muted hover:bg-surfaceMuted hover:text-ink'}`}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.7} className="shrink-0" />
      {!collapsed ? <span className="sidebar-label truncate">{entry.label}</span> : null}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { canEditInventory } = useInventoryPermissions();
  const createRoute = buildHomeCreateRoute(location.pathname, location.search);
  return (
    <aside
      aria-label="主导航"
      data-sidebar-collapsed={collapsed}
      className={`app-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface transition-[width] duration-180 md:flex ${collapsed ? 'w-[72px]' : 'w-[72px] min-[1200px]:w-56'}`}
    >
      <div className="flex min-h-[94px] items-center justify-between gap-2 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="归位首页">
          <img src="/branding/inplace-logo-mark.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
          {!collapsed ? <span className="sidebar-label"><strong className="block text-[23px] font-semibold leading-7 tracking-tight">归位</strong><small className="text-[10px] tracking-widest text-muted">INPLACE</small></span> : null}
        </Link>
        {!collapsed ? <button type="button" onClick={onToggle} aria-label="折叠菜单" aria-expanded="true" className="sidebar-label shrink-0 rounded-lg p-1 text-muted hover:text-brandStrong"><PanelLeftClose size={17} /></button> : null}
      </div>
      <div className="space-y-3 px-3 pb-6">
        {!collapsed ? <div className="sidebar-label"><HouseholdSwitcher /></div> : null}
        {canEditInventory ? <Link to={createRoute} aria-label="立即新增" title="立即新增" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brandStrong px-2 text-[13px] font-medium text-white hover:bg-brandHover"><Plus size={18} />{!collapsed ? <span className="sidebar-label">立即新增</span> : null}</Link> : null}
        {collapsed ? <button type="button" onClick={onToggle} aria-label="展开菜单" aria-expanded="false" className="ui-icon-button"><PanelLeftOpen size={18} /></button> : null}
      </div>
      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAVIGATION_SECTIONS.map(section => <div key={section.id}>
          {!collapsed ? <p className="sidebar-label mb-2 px-3 text-[10px] tracking-[0.14em] text-muted">{section.label}</p> : null}
          <div className="space-y-1">{NAV_ITEMS.filter(item => item.section === section.id).map(entry => <SidebarLink key={entry.id} entry={entry} collapsed={collapsed} pathname={location.pathname} />)}</div>
        </div>)}
        <div>
          {!collapsed ? <p className="sidebar-label mb-2 px-3 text-[10px] tracking-[0.14em] text-muted">家庭工具</p> : null}
          <div className="space-y-1">{TOOLS.map(entry => <SidebarLink key={entry.to} entry={entry} collapsed={collapsed} pathname={location.pathname} />)}</div>
        </div>
      </nav>
      <div className="sidebar-label border-t border-border px-5 py-5"><BrandVersionFooter compact={collapsed} className="justify-start" /></div>
    </aside>
  );
}
