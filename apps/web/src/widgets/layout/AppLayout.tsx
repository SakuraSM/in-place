import { useEffect, useState, type ReactNode } from 'react';
import WorkspaceHeader from './WorkspaceHeader';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import BrandVersionFooter from '../../shared/ui/BrandVersionFooter';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'inplace:sidebar-collapsed';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true',
  );

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="flex min-h-dvh bg-canvas">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <main
        id="main-content"
        tabIndex={-1}
        data-scroll-root
        className={`flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-clip bg-canvas pb-[var(--mobile-nav-offset)] md:h-dvh md:min-h-0 md:overflow-x-hidden md:overflow-y-auto md:pb-0 ${
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[72px] min-[1200px]:ml-56'
        }`}
      >
        <WorkspaceHeader />
        {children}
        <footer className="app-page-gutter py-5 md:hidden">
          <BrandVersionFooter compact className="justify-center" />
        </footer>
      </main>
      <BottomNav />
    </div>
  );
}
