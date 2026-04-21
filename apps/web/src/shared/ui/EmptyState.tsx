import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  iconMotion?: Record<string, unknown>;
}

export default function EmptyState({ icon, title, description, iconMotion }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100"
        {...(iconMotion ?? {})}
      >
        {icon}
      </motion.div>
      <p className="mb-1 font-medium text-slate-500">{title}</p>
      {description ? (
        <p className="text-sm text-slate-400">{description}</p>
      ) : null}
    </motion.div>
  );
}
