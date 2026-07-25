import { useEffect, useState, type ReactNode } from 'react';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import BrandVersionFooter from '../../shared/ui/BrandVersionFooter';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'inplace:sidebar-collapsed';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (storedValue === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="flex min-h-screen bg-canvas">
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
        className={`flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden bg-canvas pb-20 md:h-screen md:pb-0 ${
          sidebarCollapsed ? 'md:ml-24' : 'md:ml-64 lg:ml-72'
        }`}
      >
        {children}
        <footer className="px-4 pb-24 pt-3 md:hidden">
          <BrandVersionFooter compact className="justify-center" />
        </footer>
      </main>
      <BottomNav />
    </div>
  );
}
