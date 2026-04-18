import { ChevronRight, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BreadcrumbItem } from '../../../legacy/database.types';
import { crumbItem } from '../../../shared/lib/animations';

interface Props {
  items: BreadcrumbItem[];
  onNavigate: (id: string | null) => void;
}

export default function Breadcrumb({ items, onNavigate }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 pr-2">
      <motion.button
        onClick={() => onNavigate(null)}
        whileHover={{ scale: 1.15, color: '#0ea5e9' }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="flex items-center gap-1 shrink-0 text-slate-500 transition-colors"
      >
        <Home size={14} />
      </motion.button>
      <AnimatePresence mode="popLayout">
        {items.map((crumb, i) => (
          <motion.div
            key={crumb.id}
            variants={crumbItem}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex items-center gap-1 shrink-0"
          >
            <ChevronRight size={12} className="text-slate-300" />
            <motion.button
              onClick={() => onNavigate(crumb.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`text-xs font-medium transition-colors max-w-[100px] truncate ${
                i === items.length - 1
                  ? 'text-slate-800'
                  : 'text-slate-400 hover:text-sky-500'
              }`}
            >
              {crumb.name}
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
