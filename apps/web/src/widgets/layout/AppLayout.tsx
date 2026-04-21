import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { pageTransition } from '../../shared/lib/animations';

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
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <motion.div
        className={`flex min-h-screen min-w-0 flex-1 flex-col pb-20 md:h-screen md:pb-0 ${
          sidebarCollapsed ? 'md:ml-24' : 'md:ml-64 lg:ml-72'
        }`}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
      <BottomNav />
    </div>
  );
}
