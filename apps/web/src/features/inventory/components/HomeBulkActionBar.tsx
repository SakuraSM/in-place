import { SquarePen, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface HomeBulkActionBarProps {
  selectedCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

export default function HomeBulkActionBar({
  selectedCount,
  onEdit,
  onDelete,
}: HomeBulkActionBarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 md:bottom-8 md:left-auto md:right-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        role="region"
        aria-label="批量操作"
        className="ml-auto w-full rounded-3xl border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur-xl md:w-[360px]"
      >
        <p className="mb-3 px-1 text-sm font-bold text-slate-900">
          已选择 {selectedCount} 项
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={!hasSelection}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brandStrong px-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-200"
          >
            <SquarePen size={15} />
            批量编辑
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!hasSelection}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Trash2 size={15} />
            批量删除
          </button>
        </div>
      </motion.div>
    </div>
  );
}
