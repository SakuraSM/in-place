import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { pageTransition } from '../../shared/lib/animations';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <motion.div
        className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-64 md:h-screen lg:ml-72 pb-20 md:pb-0"
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
