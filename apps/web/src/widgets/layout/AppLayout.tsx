import { useEffect, useState, type ReactNode } from 'react';
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
        className={`flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-canvas pb-[var(--mobile-nav-offset)] lg:h-dvh lg:min-h-0 lg:pb-0 ${
          sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-64 xl:ml-72'
        }`}
      >
        {children}
        <footer className="app-page-gutter py-5 lg:hidden">
          <BrandVersionFooter compact className="justify-center" />
        </footer>
      </main>
      <BottomNav />
    </div>
  );
}
